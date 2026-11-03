"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useCurrentProcess, ProcessHeader } from "@/components/process-header";
import { calculateProcessMetrics } from "@/lib/calculations";
import { money, minutes, number, modeLabels } from "@/lib/format";
import { validateWorkflow } from "@/lib/validation";
import { WorkflowGate } from "@/components/workflow-gate";
import { Activity, ArrowRight, BarChart3, Clock3, DollarSign, Lightbulb, PenLine, Pencil, Save, Users, Workflow } from "lucide-react";
import { useFlowprintStore } from "@/stores/flowprint-store";

export function ProcessOverviewView() {
  const process = useCurrentProcess();
  const updateProcess = useFlowprintStore((s) => s.updateProcess);
  const [editing,setEditing] = useState(false);
  const [details,setDetails] = useState({ name:"", description:"", department:"", monthlyVolume:"", hourlyLaborCost:"" });
  if (!process) return <main className="page-content"><div className="card empty-state"><b>Proses tidak ditemukan</b><p>Data mungkin telah dihapus dari browser ini.</p><Link className="button" href="/app/processes">Kembali ke library</Link></div></main>;
  const workflow = validateWorkflow(process.graph);
  if (!workflow.valid) return <main className="page-content"><ProcessHeader process={process} subtitle="Baseline workflow perlu divalidasi sebelum analisis."/><WorkflowGate processId={process.id} issues={workflow.issues}/></main>;
  const metrics = calculateProcessMetrics(process.graph, process.monthlyVolume, process.hourlyLaborCost);
  const ordered = [...process.graph.nodes].sort((a,b) => a.position.y - b.position.y);
  const activities = ordered.filter((n) => n.type === "activity" || n.type === "wait");
  return <main className="page-content">
    <ProcessHeader process={process} subtitle={process.description}/>
    <div className="card" style={{ padding:"12px 15px", marginBottom:14, display:"flex", gap:9, alignItems:"center", flexWrap:"wrap" }}><span className="pill amber">Illustrative demo data</span><span className="tiny muted">Baseline: {number(process.monthlyVolume)} pengajuan/bulan · biaya tenaga kerja {money(process.hourlyLaborCost)}/jam · diperbarui {new Date(process.updatedAt).toLocaleDateString("id-ID")}</span><button className="button small" style={{marginLeft:"auto"}} onClick={()=>{setDetails({name:process.name,description:process.description,department:process.department,monthlyVolume:String(process.monthlyVolume),hourlyLaborCost:String(process.hourlyLaborCost)});setEditing(true);}}><Pencil size={11}/> Edit details</button></div>
    <div className="stat-grid">
      <div className="card stat-card"><div className="stat-icon purple"><Activity size={15}/></div><div className="metric-value">{metrics.activityCount}</div><div className="metric-label">Aktivitas proses</div><div className="metric-foot"><span>{metrics.manualCount} manual · {metrics.semiAutomatedCount} semi-otomatis</span></div></div>
      <div className="card stat-card"><div className="stat-icon teal"><Clock3 size={15}/></div><div className="metric-value">{minutes(metrics.humanEffortMinutes)}</div><div className="metric-label">Human effort / eksekusi</div><div className="metric-foot"><span>Input dari node aktivitas</span></div></div>
      <div className="card stat-card"><div className="stat-icon amber"><Clock3 size={15}/></div><div className="metric-value">{minutes(metrics.waitingMinutes)}</div><div className="metric-label">Total waktu tunggu</div><div className="metric-foot"><span>Node tunggu + waktu tunggu aktivitas</span></div></div>
      <div className="card stat-card"><div className="stat-icon red"><DollarSign size={15}/></div><div className="metric-value" style={{ fontSize:19 }}>{money(metrics.monthlyCost)}</div><div className="metric-label">Estimasi biaya tenaga kerja / bulan</div><div className="metric-foot"><span>{number(metrics.monthlyHours,1)} jam kerja / bulan</span></div></div>
    </div>
    <div className="two-col" style={{ marginTop:16, alignItems:"start" }}>
      <section className="card">
        <div className="card-head"><div><h2>As-Is workflow</h2><p>Baseline proses saat ini · {activities.length} langkah bernilai</p></div><Link className="button small" href={`/app/processes/${process.id}/studio`}><PenLine size={12}/> Edit di Studio</Link></div>
        <div className="card-body" style={{ paddingTop:12 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:0, maxWidth:540, margin:"auto" }}>
            {ordered.map((node, index) => <div key={node.id} style={{ display:"grid", gridTemplateColumns:"28px minmax(0,1fr)", gap:10, position:"relative" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}><span style={{ width:23,height:23,borderRadius:7,display:"grid",placeItems:"center",background:node.type === "start" || node.type === "end" ? "#f0eeff" : node.type === "wait" ? "#fff5e5" : "#eeeff8",color:node.type === "wait" ? "#bd7c1a" : "#665cf0" }}>{node.type === "start" ? "▶" : node.type === "end" ? "✓" : node.type === "wait" ? "◷" : index.toString().padStart(2,"0")}</span>{index < ordered.length - 1 && <span style={{ width:1, flex:1, minHeight:26, background:"#e6e7ef" }}/>}</div>
              <div style={{ padding:"2px 0 17px" }}><div style={{ fontSize:10,fontWeight:680 }}>{node.data.label}</div>{(node.type === "activity" || node.type === "wait") && <div className="tiny muted" style={{ marginTop:4, display:"flex", gap:9, flexWrap:"wrap" }}><span>{node.type === "wait" ? `Tunggu ${minutes(node.data.waitMinutes)}` : `${minutes(node.data.effortMinutes)} effort`}</span>{node.type === "activity" && <span>{modeLabels[node.data.workMode]}</span>}{node.data.ownerRole && <span>{node.data.ownerRole}</span>}{node.data.waitMinutes > 0 && node.type === "activity" && <span>+ {minutes(node.data.waitMinutes)} tunggu</span>}</div>}</div>
            </div>)}
          </div>
        </div>
      </section>
      <div style={{ display:"grid", gap:14 }}>
        <section className="card">
          <div className="card-head"><div><h2>Process intelligence</h2><p>Perhitungan dari graph dan asumsi volume.</p></div><Link href={`/app/processes/${process.id}/intelligence`} className="button ghost small">Buka <ArrowRight size={12}/></Link></div>
          <div className="card-body"><div className="two-col" style={{ gap:8 }}>
            <div className="compare-value"><span>Cycle time estimasi</span><b>{minutes(metrics.cycleMinutes)}</b></div><div className="compare-value"><span>Biaya / bulan</span><b style={{ fontSize:15 }}>{money(metrics.monthlyCost)}</b></div><div className="compare-value"><span>Aktivitas manual</span><b>{metrics.manualCount} / {metrics.activityCount}</b></div><div className="compare-value"><span>Volume</span><b>{number(process.monthlyVolume)}<small style={{ fontSize:9, color:"var(--muted)", fontWeight:500 }}> / bln</small></b></div>
          </div></div>
        </section>
        <section className="card">
          <div className="card-head"><div><h2>Next steps</h2><p>Lengkapi journey improvement Anda.</p></div></div>
          <div className="card-body" style={{ display:"grid", gap:9 }}>
            <Link href={`/app/processes/${process.id}/opportunities`} className="insight-card"><span className="insight-symbol"><Lightbulb size={14}/></span><span><h3>Review automation opportunities</h3><p>Inspeksi skor, faktor, dan tindakan berikutnya.</p></span><ArrowRight size={13} style={{ marginLeft:"auto", color:"#969bad" }}/></Link>
            <Link href={`/app/processes/${process.id}/scenarios`} className="insight-card" style={{ background:"#fbfaff" }}><span className="insight-symbol" style={{ background:"#eeecff", color:"var(--primary)" }}><BarChart3 size={14}/></span><span><h3>Compare before vs after</h3><p>Rancang To-Be dan uji dampak berdasarkan asumsi.</p></span><ArrowRight size={13} style={{ marginLeft:"auto", color:"#969bad" }}/></Link>
            <Link href={`/app/processes/${process.id}/reports`} className="insight-card" style={{ background:"#fbfbfd" }}><span className="insight-symbol" style={{ background:"#eef8f5", color:"var(--teal)" }}><Users size={14}/></span><span><h3>Prepare executive report</h3><p>Ekspor ringkasan untuk diskusi stakeholder.</p></span><ArrowRight size={13} style={{ marginLeft:"auto", color:"#969bad" }}/></Link>
          </div>
        </section>
      </div>
    </div>
    {editing && <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setEditing(false);}}><div className="modal" role="dialog" aria-modal="true" aria-label="Edit process details"><h2>Edit process details</h2><p>Perbarui konteks dan asumsi biaya. Metrik akan dihitung ulang dari graph yang tersimpan.</p>
      <div className="form-field"><label>Nama proses</label><input className="input" value={details.name} onChange={(e)=>setDetails({...details,name:e.target.value})}/></div>
      <div className="form-field"><label>Deskripsi</label><textarea className="textarea" value={details.description} onChange={(e)=>setDetails({...details,description:e.target.value})}/></div>
      <div className="form-field"><label>Departemen</label><input className="input" value={details.department} onChange={(e)=>setDetails({...details,department:e.target.value})}/></div>
      <div className="inspector-grid"><div className="form-field"><label>Volume bulanan</label><input className="input" type="number" min="1" value={details.monthlyVolume} onChange={(e)=>setDetails({...details,monthlyVolume:e.target.value})}/></div><div className="form-field"><label>Biaya tenaga kerja / jam (IDR)</label><input className="input" type="number" min="0" value={details.hourlyLaborCost} onChange={(e)=>setDetails({...details,hourlyLaborCost:e.target.value})}/></div></div>
      <div className="modal-actions"><button className="button" onClick={()=>setEditing(false)}>Batal</button><button className="button primary" onClick={()=>{const volume=Number(details.monthlyVolume),cost=Number(details.hourlyLaborCost);if(details.name.trim().length<3||details.description.trim().length<12||details.department.trim().length<2||!Number.isInteger(volume)||volume<1||!Number.isFinite(cost)||cost<0){toast.error("Periksa nama, deskripsi, departemen, volume, dan biaya.");return;}updateProcess(process.id,{name:details.name.trim(),description:details.description.trim(),department:details.department.trim(),monthlyVolume:volume,hourlyLaborCost:cost});setEditing(false);toast.success("Process details diperbarui.");}}><Save size={12}/> Simpan perubahan</button></div>
    </div></div>}
  </main>;
}
