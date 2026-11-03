import { calculateOpportunityScore, opportunityPriority } from "@/lib/calculations";
import type { BusinessProcess, FlowNode, Opportunity, RecommendationCategory } from "@/lib/types";

function identifyCategory(node: FlowNode, volume: number): RecommendationCategory | null {
  const d = node.data;
  if (d.waitMinutes >= 120) return "Reduce waiting";
  if (d.standardization <= 2) return "Standardize";
  if ((d.description + d.label).toLowerCase().match(/redundant|duplicate|duplikasi|berulang dua kali/)) return "Simplify";
  if (d.workMode === "manual" && volume >= 100 && d.repeatability >= 4 && d.standardization >= 3) return "Automate";
  if (d.integrationReadiness >= 4 && Boolean(d.systemName) && d.workMode !== "automated") return "Integrate";
  if (d.workMode === "manual" && d.repeatability >= 4 && d.standardization >= 4) return "Automate";
  return null;
}

function buildExplanation(node: FlowNode, category: RecommendationCategory, volume: number) {
  const d = node.data;
  if (category === "Reduce waiting") return `Waktu tunggu tercatat ${Math.round(d.waitMinutes)} menit per pengajuan. Uji SLA, notifikasi, dan jalur persetujuan yang lebih terstruktur sebelum mengubah kebijakan.`;
  if (category === "Standardize") return `Skor standardisasi saat ini ${d.standardization}/5. Template dan aturan input yang konsisten dapat mengurangi variasi pekerjaan.`;
  if (category === "Integrate") return `Aktivitas menggunakan ${d.systemName} dengan kesiapan integrasi ${d.integrationReadiness}/5. Evaluasi pertukaran data untuk mengurangi pemindahan informasi manual.`;
  if (category === "Simplify") return "Deskripsi aktivitas menunjukkan langkah yang mungkin berulang. Konfirmasikan duplikasi dengan pemilik proses sebelum menghapus atau menggabungkannya.";
  return `Aktivitas manual ini terjadi sekitar ${volume.toLocaleString("id-ID")} kali per bulan dengan repetisi ${d.repeatability}/5. Ini kandidat untuk discovery automasi, bukan prediksi keberhasilan implementasi.`;
}

export function generateOpportunities(process: BusinessProcess): Opportunity[] {
  const activities = process.graph.nodes.filter((node) => node.type === "activity");
  return activities.flatMap((node) => {
    const category = identifyCategory(node, process.monthlyVolume);
    if (!category) return [];
    const score = calculateOpportunityScore(node, process.monthlyVolume);
    const factors: string[] = [];
    if (process.monthlyVolume >= 100) factors.push(`Volume ${process.monthlyVolume}/bln`);
    if (node.data.workMode === "manual") factors.push("Pekerjaan manual");
    if (node.data.repeatability >= 4) factors.push(`Repetisi ${node.data.repeatability}/5`);
    if (node.data.standardization <= 2) factors.push(`Standardisasi ${node.data.standardization}/5`);
    else if (node.data.standardization >= 4) factors.push(`Standar ${node.data.standardization}/5`);
    if (node.data.waitMinutes > 0) factors.push(`Tunggu ${Math.round(node.data.waitMinutes)} mnt`);
    if (node.data.integrationReadiness >= 4) factors.push(`Integrasi ${node.data.integrationReadiness}/5`);
    const nextAction = category === "Automate"
      ? "Validasi variasi kasus dan exception bersama process owner, lalu uji automasi pada sampel kecil."
      : category === "Reduce waiting"
      ? "Petakan waktu persetujuan aktual dan tetapkan SLA serta notifikasi eskalasi."
      : category === "Standardize"
      ? "Sepakati checklist, format input, dan kriteria selesai lintas pemilik proses."
      : category === "Integrate"
      ? "Periksa API/connector yang tersedia dan lakukan uji rekonsiliasi data."
      : "Konfirmasi langkah yang berulang dengan process owner sebelum desain ulang.";
    const focus = category === "Reduce waiting" ? "Waktu siklus & SLA" : category === "Standardize" ? "Variasi & kualitas input" : category === "Integrate" ? "Serah-terima data" : category === "Simplify" ? "Kompleksitas proses" : "Effort manual";
    return [{
      id: `${process.id}-${node.id}-${category.toLowerCase().replaceAll(" ", "-")}`,
      processId: process.id,
      nodeId: node.id,
      activityName: node.data.label,
      score,
      priority: opportunityPriority(score),
      category,
      explanation: buildExplanation(node, category, process.monthlyVolume),
      factors: factors.length ? factors : ["Potensi perlu ditinjau"],
      nextAction,
      focus,
    }];
  }).sort((a, b) => b.score - a.score);
}
