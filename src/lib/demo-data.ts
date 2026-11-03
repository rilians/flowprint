import { MarkerType } from "@xyflow/react";
import type { BusinessProcess, FlowEdge, FlowNode, FlowNodeData, NodeKind, Scenario, WorkflowGraph } from "@/lib/types";

function node(
  id: string,
  type: NodeKind,
  label: string,
  position: { x: number; y: number },
  fields: Partial<FlowNodeData> = {},
): FlowNode {
  const data: FlowNodeData = {
    label,
    description: "",
    ownerRole: "",
    workMode: "manual",
    effortMinutes: 0,
    waitMinutes: 0,
    systemName: "",
    repeatability: 3,
    standardization: 3,
    errorImpact: 3,
    integrationReadiness: 3,
    ...fields,
  };
  return { id, type, position, data };
}

function edge(source: string, target: string, index: number): FlowEdge {
  return { id: `e-${source}-${target}-${index}`, source, target, type: "smoothstep", animated: false, markerEnd: { type: MarkerType.ArrowClosed } };
}

function graph(nodes: FlowNode[]): WorkflowGraph {
  return { nodes, edges: nodes.slice(0, -1).map((item, i) => edge(item.id, nodes[i + 1].id, i)), schemaVersion: 1 };
}

const reimbursementGraph = graph([
  node("reim-start", "start", "Mulai pengajuan", { x: 260, y: 20 }),
  node("reim-form", "activity", "Isi formulir reimbursement", { x: 260, y: 130 }, {
    description: "Karyawan mengisi detail pengeluaran dan tujuan perjalanan.", ownerRole: "Karyawan", effortMinutes: 10, workMode: "manual", systemName: "Google Forms", repeatability: 5, standardization: 4, errorImpact: 3, integrationReadiness: 4,
  }),
  node("reim-docs", "activity", "Kirim dokumen pendukung", { x: 260, y: 240 }, {
    description: "Kuitansi dan bukti pembayaran dikirim melalui email.", ownerRole: "Karyawan", effortMinutes: 5, workMode: "manual", systemName: "Email", repeatability: 5, standardization: 3, errorImpact: 4, integrationReadiness: 3,
  }),
  node("reim-verify", "activity", "Verifikasi kelengkapan", { x: 260, y: 350 }, {
    description: "Admin memeriksa bukti, kebijakan, dan kelengkapan nominal.", ownerRole: "Admin Finance", effortMinutes: 20, workMode: "manual", systemName: "Email + Drive", repeatability: 4, standardization: 4, errorImpact: 5, integrationReadiness: 4,
  }),
  node("reim-approve", "activity", "Persetujuan manajer", { x: 260, y: 460 }, {
    description: "Pengajuan menunggu persetujuan manajer sebelum diproses finance.", ownerRole: "Manajer", effortMinutes: 0, waitMinutes: 480, workMode: "manual", systemName: "Email", repeatability: 4, standardization: 3, errorImpact: 4, integrationReadiness: 3,
  }),
  node("reim-record", "activity", "Catat transaksi keuangan", { x: 260, y: 570 }, {
    description: "Finance memindahkan data pengajuan yang disetujui ke lembar kerja.", ownerRole: "Finance", effortMinutes: 15, workMode: "manual", systemName: "Microsoft Excel", repeatability: 5, standardization: 4, errorImpact: 4, integrationReadiness: 4,
  }),
  node("reim-pay", "activity", "Proses pembayaran", { x: 260, y: 680 }, {
    description: "Finance menjadwalkan dan memproses pembayaran reimbursement.", ownerRole: "Finance", effortMinutes: 10, workMode: "semi_automated", systemName: "Banking portal", repeatability: 4, standardization: 4, errorImpact: 3, integrationReadiness: 4,
  }),
  node("reim-end", "end", "Selesai", { x: 260, y: 790 }),
]);

const onboardingGraph = graph([
  node("on-start", "start", "Mulai onboarding", { x: 260, y: 20 }),
  node("on-info", "activity", "Terima data karyawan", { x: 260, y: 130 }, {
    description: "HR menerima detail karyawan baru dari hiring manager.", ownerRole: "HR", effortMinutes: 12, workMode: "manual", systemName: "Email", repeatability: 5, standardization: 3, errorImpact: 3, integrationReadiness: 3,
  }),
  node("on-docs", "activity", "Verifikasi dokumen", { x: 260, y: 240 }, {
    description: "HR memvalidasi identitas, kontrak, dan dokumen pajak.", ownerRole: "HR", effortMinutes: 18, workMode: "manual", systemName: "Drive", repeatability: 4, standardization: 4, errorImpact: 4, integrationReadiness: 4,
  }),
  node("on-wait", "wait", "Menunggu hari pertama", { x: 260, y: 350 }, {
    description: "Waktu tunggu sampai tanggal mulai bekerja.", ownerRole: "HR", waitMinutes: 7200, department: "People Operations",
  }),
  node("on-it", "activity", "Siapkan akun dan perangkat", { x: 260, y: 460 }, {
    description: "Tim IT menyiapkan akses sistem, laptop, dan akun kerja.", ownerRole: "IT Operations", effortMinutes: 22, workMode: "semi_automated", systemName: "Identity provider", repeatability: 5, standardization: 4, errorImpact: 4, integrationReadiness: 5,
  }),
  node("on-manager", "activity", "Tetapkan tanggung jawab", { x: 260, y: 570 }, {
    description: "Manajer menentukan buddy, tujuan awal, dan akses tim.", ownerRole: "Hiring Manager", effortMinutes: 10, workMode: "manual", systemName: "Notion", repeatability: 3, standardization: 2, errorImpact: 3, integrationReadiness: 3,
  }),
  node("on-employee", "activity", "Selesaikan orientasi", { x: 260, y: 680 }, {
    description: "Karyawan menyelesaikan materi orientasi dan kebijakan.", ownerRole: "Karyawan", effortMinutes: 30, workMode: "semi_automated", systemName: "LMS", repeatability: 4, standardization: 4, errorImpact: 2, integrationReadiness: 4,
  }),
  node("on-end", "end", "Siap bekerja", { x: 260, y: 790 }),
]);

const purchaseGraph = graph([
  node("pr-start", "start", "Mulai permintaan", { x: 260, y: 20 }),
  node("pr-submit", "activity", "Ajukan permintaan pembelian", { x: 260, y: 130 }, {
    description: "Pemohon mengisi kebutuhan, estimasi biaya, dan pusat biaya.", ownerRole: "Karyawan", effortMinutes: 12, workMode: "manual", systemName: "Form internal", repeatability: 5, standardization: 4, errorImpact: 4, integrationReadiness: 4,
  }),
  node("pr-review", "activity", "Review procurement", { x: 260, y: 240 }, {
    description: "Procurement mengecek spesifikasi dan ketersediaan vendor.", ownerRole: "Procurement", effortMinutes: 25, workMode: "manual", systemName: "Email + Excel", repeatability: 4, standardization: 3, errorImpact: 4, integrationReadiness: 3,
  }),
  node("pr-approve", "activity", "Persetujuan manajer", { x: 260, y: 350 }, {
    description: "Permintaan menunggu persetujuan sesuai limit anggaran.", ownerRole: "Manajer", effortMinutes: 4, waitMinutes: 360, workMode: "manual", systemName: "Email", repeatability: 5, standardization: 4, errorImpact: 4, integrationReadiness: 4,
  }),
  node("pr-vendor", "activity", "Konfirmasi pemasok", { x: 260, y: 460 }, {
    description: "Procurement meminta penawaran dan mengonfirmasi lead time.", ownerRole: "Procurement", effortMinutes: 30, workMode: "manual", systemName: "Email", repeatability: 3, standardization: 3, errorImpact: 3, integrationReadiness: 3,
  }),
  node("pr-pay", "activity", "Proses pembayaran", { x: 260, y: 570 }, {
    description: "Finance memproses invoice setelah barang diterima.", ownerRole: "Finance", effortMinutes: 18, workMode: "semi_automated", systemName: "ERP", repeatability: 4, standardization: 4, errorImpact: 4, integrationReadiness: 5,
  }),
  node("pr-end", "end", "Selesai", { x: 260, y: 680 }),
]);

const now = Date.parse("2026-11-03T10:00:00+07:00");
function dateAgo(days: number) { return new Date(now - days * 86400000).toISOString(); }

export const demoProcesses: BusinessProcess[] = [
  {
    id: "employee-reimbursement", name: "Reimbursement karyawan", description: "Pengajuan dan pembayaran klaim pengeluaran karyawan.", department: "Finance", monthlyVolume: 420, currency: "IDR", hourlyLaborCost: 65000, graph: reimbursementGraph, updatedAt: dateAgo(1), createdAt: dateAgo(25), analysisStatus: "analyzed",
  },
  {
    id: "employee-onboarding", name: "Employee onboarding", description: "Persiapan administrasi dan operasional untuk karyawan baru.", department: "People Operations", monthlyVolume: 24, currency: "IDR", hourlyLaborCost: 72000, graph: onboardingGraph, updatedAt: dateAgo(3), createdAt: dateAgo(42), analysisStatus: "analyzed",
  },
  {
    id: "purchase-approval", name: "Purchase request approval", description: "Review, persetujuan, dan pemenuhan permintaan pembelian.", department: "Procurement", monthlyVolume: 95, currency: "IDR", hourlyLaborCost: 78000, graph: purchaseGraph, updatedAt: dateAgo(7), createdAt: dateAgo(67), analysisStatus: "draft",
  },
];

const proposedGraph: WorkflowGraph = {
  ...reimbursementGraph,
  nodes: reimbursementGraph.nodes.map((n) => {
    const changes: Record<string, {workMode?:FlowNodeData["workMode"]; effortMinutes?:number; waitMinutes?:number}> = {
      "reim-form": { workMode:"automated", effortMinutes:2 },
      "reim-docs": { workMode:"automated", effortMinutes:1 },
      "reim-verify": { workMode:"semi_automated", effortMinutes:7 },
      "reim-approve": { workMode:"manual", waitMinutes:120 },
      "reim-record": { workMode:"automated", effortMinutes:3 },
      "reim-pay": { workMode:"semi_automated", effortMinutes:2 },
    };
    return { ...n, data:{ ...n.data, ...(changes[n.id] || {}) } };
  }),
};
export const demoScenarios: Scenario[] = [{
  id:"demo-reimbursement-to-be",
  processId:"employee-reimbursement",
  name:"Reimbursement digital",
  description:"Ilustrasi target: input terstruktur, validasi dokumen, notifikasi persetujuan, dan pencatatan terintegrasi. Bukan hasil pengukuran perusahaan sungguhan.",
  graph:proposedGraph,
  adoptionRate:0.75,
  implementationCost:50000000,
  createdAt:dateAgo(2),
  updatedAt:dateAgo(1),
}];
