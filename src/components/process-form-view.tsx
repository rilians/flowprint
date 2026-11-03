"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info, Save } from "lucide-react";
import { MarkerType } from "@xyflow/react";
import { toast } from "sonner";
import { useFlowprintStore } from "@/stores/flowprint-store";
import type { BusinessProcess, FlowNode } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(80, "Nama maksimal 80 karakter."),
  description: z.string().trim().min(12, "Deskripsi minimal 12 karakter.").max(240, "Deskripsi terlalu panjang."),
  department: z.string().trim().min(2, "Isi departemen atau fungsi."),
  monthlyVolume: z.coerce.number().int().min(1, "Volume minimal 1.").max(1000000, "Volume terlalu besar."),
  hourlyLaborCost: z.coerce.number().min(0, "Biaya tidak boleh negatif.").max(1000000000, "Biaya terlalu besar."),
});
type Values = z.output<typeof schema>;

function createInitialGraph(): BusinessProcess["graph"] {
  const defaults = { description:"", ownerRole:"", workMode:"manual" as const, effortMinutes:15, waitMinutes:0, systemName:"", repeatability:3, standardization:3, errorImpact:3, integrationReadiness:3 };
  const nodes: FlowNode[] = [
    { id:"start", type:"start", position:{ x:260,y:80 }, data:{ ...defaults,label:"Mulai proses" } },
    { id:"activity", type:"activity", position:{ x:260,y:250 }, data:{ ...defaults,label:"Aktivitas baru" } },
    { id:"end", type:"end", position:{ x:260,y:420 }, data:{ ...defaults,label:"Selesai" } },
  ];
  return { nodes, edges:[{ id:"edge-start-activity",source:"start",target:"activity",type:"smoothstep",markerEnd:{type:MarkerType.ArrowClosed} },{ id:"edge-activity-end",source:"activity",target:"end",type:"smoothstep",markerEnd:{type:MarkerType.ArrowClosed} }], schemaVersion:1 };
}

export function ProcessFormView() {
  const router = useRouter();
  const addProcess = useFlowprintStore((s) => s.addProcess);
  const { register, handleSubmit, formState:{ errors, isSubmitting } } = useForm<z.input<typeof schema>, unknown, Values>({
    resolver:zodResolver(schema), defaultValues:{ name:"", description:"", department:"Operations", monthlyVolume:100, hourlyLaborCost:65000 },
  });
  const submit = (values:Values) => {
    const id = `process-${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const process: BusinessProcess = { id, ...values, currency:"IDR", graph:createInitialGraph(), createdAt:now, updatedAt:now, analysisStatus:"draft" };
    addProcess(process);
    toast.success("Proses dibuat. Baseline siap dilengkapi di Process Studio.");
    router.push(`/app/processes/${id}/studio`);
  };
  return <main className="page-content" style={{ maxWidth:1000 }}>
    <div className="page-heading"><div><div className="eyebrow">Process setup</div><h1>Buat proses baru</h1><p>Mulai dengan konteks dan asumsi operasional. Anda dapat mengubahnya kapan saja.</p></div><Link href="/app/processes" className="button"><ArrowLeft size={13}/> Kembali ke library</Link></div>
    <div className="two-col" style={{ alignItems:"start" }}>
      <form className="card card-body" onSubmit={handleSubmit(submit)}>
        <div className="eyebrow">01 / Process information</div><h2 style={{ fontSize:15, margin:"5px 0 18px" }}>Informasi dasar</h2>
        <div className="form-field"><label htmlFor="name">Nama proses</label><input id="name" className="input" placeholder="Contoh: Vendor invoice approval" {...register("name" as const)}/>{errors.name && <span className="tiny" style={{ color:"var(--red)" }}>{errors.name.message}</span>}</div>
        <div className="form-field"><label htmlFor="description">Deskripsi</label><textarea id="description" className="textarea" placeholder="Jelaskan tujuan dan batasan proses…" {...register("description" as const)}/>{errors.description && <span className="tiny" style={{ color:"var(--red)" }}>{errors.description.message}</span>}</div>
        <div className="form-field"><label htmlFor="department">Departemen / fungsi</label><input id="department" className="input" placeholder="Operations" {...register("department" as const)}/>{errors.department && <span className="tiny" style={{ color:"var(--red)" }}>{errors.department.message}</span>}</div>
        <div className="inspector-grid">
          <div className="form-field"><label htmlFor="monthlyVolume">Volume per bulan</label><input id="monthlyVolume" type="number" min="1" className="input" {...register("monthlyVolume", { valueAsNumber:true })}/>{errors.monthlyVolume && <span className="tiny" style={{ color:"var(--red)" }}>{errors.monthlyVolume.message}</span>}</div>
          <div className="form-field"><label htmlFor="hourlyLaborCost">Biaya tenaga kerja / jam (IDR)</label><input id="hourlyLaborCost" type="number" min="0" step="1000" className="input" {...register("hourlyLaborCost", { valueAsNumber:true })}/>{errors.hourlyLaborCost && <span className="tiny" style={{ color:"var(--red)" }}>{errors.hourlyLaborCost.message}</span>}</div>
        </div>
        <div className="modal-actions"><button type="button" className="button" onClick={() => router.push("/app/processes")}>Batal</button><button type="submit" className="button primary" disabled={isSubmitting}><Save size={13}/> Buat proses</button></div>
      </form>
      <div>
        <div className="card card-body" style={{ marginBottom:13 }}><div className="stat-icon purple"><Info size={15}/></div><h3 style={{ fontSize:12, margin:"0 0 7px" }}>Baseline Anda tetap aman</h3><p className="tiny muted" style={{ lineHeight:1.7, margin:0 }}>Proses baru dimulai dengan workflow Mulai → Aktivitas → Selesai. Detail ini menjadi baseline As-Is dan tersimpan pada workspace aktif—lokal di Demo Mode atau cloud saat Anda masuk.</p></div>
        <div className="card card-body"><div className="eyebrow">Good to know</div><h3 style={{ fontSize:12, margin:"5px 0 8px" }}>Angka = asumsi yang Anda masukkan</h3><p className="tiny muted" style={{ lineHeight:1.7, margin:0 }}>FLOWPRINT menghitung estimasi effort, beban kerja, dan biaya dari input ini. Lengkapi node di Studio agar insight lebih representatif. Dalam Demo Mode data tetap di browser; saat masuk, data disinkronkan ke workspace Supabase milik akun Anda.</p></div>
      </div>
    </div>
  </main>;
}
