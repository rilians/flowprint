"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, ArrowRight, BarChart3, Clock3, MoreHorizontal, Plus, Search, Workflow } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { calculateProcessMetrics } from "@/lib/calculations";
import { generateOpportunities } from "@/lib/recommendations";
import { validateWorkflow } from "@/lib/validation";
import { number } from "@/lib/format";
import { useFlowprintStore } from "@/stores/flowprint-store";
import { toast } from "sonner";

export function ProcessLibraryView() {
  const processes = useFlowprintStore((s) => s.processes);
  const deleteProcess = useFlowprintStore((s) => s.deleteProcess);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const departments = [...new Set(processes.map((p) => p.department))];
  const filtered = useMemo(() => processes.filter((p) => {
    const textMatch = `${p.name} ${p.department} ${p.description}`.toLowerCase().includes(search.toLowerCase());
    return textMatch && (department === "all" || p.department === department) && (status === "all" || (status === "analyzed" ? p.analysisStatus === "analyzed" && validateWorkflow(p.graph).valid : p.analysisStatus === "draft" || !validateWorkflow(p.graph).valid));
  }), [processes, search, department, status]);

  return <main className="page-content">
    <div className="page-heading"><div><div className="eyebrow">Process portfolio</div><h1>Process Library</h1><p>Kelola baseline workflow dan jelajahi analisis tiap proses.</p></div><Link className="button primary" href="/app/processes/new"><Plus size={14}/> Proses baru</Link></div>
    <div className="card" style={{ padding:12, marginBottom:15, display:"flex", gap:9, flexWrap:"wrap", alignItems:"center" }}>
      <div style={{ position:"relative", flex:"1 1 230px" }}><Search size={14} style={{ position:"absolute", top:10,left:10,color:"#9298a7" }}/><input className="input" style={{ paddingLeft:31 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, deskripsi, atau departemen…" /></div>
      <select className="select" style={{ width:180 }} value={department} onChange={(e) => setDepartment(e.target.value)}><option value="all">Semua departemen</option>{departments.map((d) => <option key={d}>{d}</option>)}</select>
      <select className="select" style={{ width:145 }} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Semua status</option><option value="analyzed">Analyzed</option><option value="draft">Draft</option></select>
      <span className="tiny muted" style={{ marginLeft:"auto" }}>{filtered.length} proses</span>
    </div>
    {filtered.length ? <div className="process-grid">{filtered.map((process) => {
      const metrics = calculateProcessMetrics(process.graph, process.monthlyVolume, process.hourlyLaborCost);
      const isAnalyzed = process.analysisStatus === "analyzed" && validateWorkflow(process.graph).valid;
      const opportunities = validateWorkflow(process.graph).valid ? generateOpportunities(process) : [];
      return <article className="card process-card" key={process.id}>
        <div className="process-card-top"><div className="process-icon"><Workflow size={17}/></div><button className="icon-button" aria-label={`Hapus ${process.name}`} onClick={() => setDeleteTarget(process.id)}><MoreHorizontal size={16}/></button></div>
        <Link href={`/app/processes/${process.id}`}><h3>{process.name}</h3><p>{process.description}</p></Link>
        <div className="quick-links" style={{ marginTop:10 }}><span className="pill gray">{process.department}</span><span className={`pill ${isAnalyzed ? "green" : "amber"}`}>{isAnalyzed ? "Analyzed" : "Draft"}</span></div>
        <div className="process-card-footer"><span><Activity size={11} style={{ verticalAlign:"-2px", marginRight:4 }}/>{metrics.activityCount} aktivitas</span><span><Clock3 size={11} style={{ verticalAlign:"-2px", marginRight:4 }}/>{number(process.monthlyVolume)} / bln</span><span><BarChart3 size={11} style={{ verticalAlign:"-2px", marginRight:4 }}/>{opportunities.length} insight</span></div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:11 }}><span className="tiny muted">Diperbarui {formatDistanceToNow(new Date(process.updatedAt), { addSuffix:true, locale:id })}</span><Link href={`/app/processes/${process.id}`} className="button small">Buka proses <ArrowRight size={12}/></Link></div>
      </article>;
    })}</div> : <div className="card empty-state"><Workflow size={25} style={{ margin:"0 auto 12px", color:"#a6a2ee" }}/><b style={{ display:"block", color:"var(--ink)", marginBottom:6 }}>Tidak ada proses ditemukan</b><span>Coba ubah filter atau buat process map baru.</span></div>}
    {deleteTarget && <div className="modal-backdrop"><div className="modal"><h2>Hapus proses?</h2><p>Proses dan skenario terkait akan dihapus dari penyimpanan demo lokal. Tindakan ini tidak dapat dibatalkan.</p><div className="modal-actions"><button className="button" onClick={() => setDeleteTarget(null)}>Batal</button><button className="button danger" onClick={() => { deleteProcess(deleteTarget); setDeleteTarget(null); toast.success("Proses dihapus dari demo lokal."); }}>Hapus proses</button></div></div></div>}
  </main>;
}
