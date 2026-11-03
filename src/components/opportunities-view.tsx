"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Filter, Info, Lightbulb, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ProcessHeader, useCurrentProcess } from "@/components/process-header";
import { generateOpportunities } from "@/lib/recommendations";
import { validateWorkflow } from "@/lib/validation";
import { WorkflowGate } from "@/components/workflow-gate";
import { useFlowprintStore } from "@/stores/flowprint-store";
import { AiDiscoveryPanel } from "@/components/ai/discovery-panel";

export function OpportunitiesView() {
  const process=useCurrentProcess();
  const router=useRouter();
  const apply=useFlowprintStore((s)=>s.applyRecommendation);
  const dismiss=useFlowprintStore((s)=>s.dismissOpportunity);
  const restore=useFlowprintStore((s)=>s.restoreOpportunity);
  const dismissed=useFlowprintStore((s)=>s.dismissedOpportunityIds);
  const allScenarios=useFlowprintStore((s)=>s.scenarios);
  const scenarios=useMemo(()=>allScenarios.filter((item)=>item.processId===process?.id),[allScenarios,process?.id]);
  const [targetScenarioId,setTargetScenarioId]=useState<string|null>(null);
  const targetScenarioOption=targetScenarioId==="__new__"?"__new__":scenarios.some((item)=>item.id===targetScenarioId)?targetScenarioId||"__new__":scenarios[0]?.id||"__new__";
  const [category,setCategory]=useState("all");
  const [priority,setPriority]=useState("all");
  const [showDismissed,setShowDismissed]=useState(false);
  const workflow=process?validateWorkflow(process.graph):null;
  const all=useMemo(()=>process&&workflow?.valid?generateOpportunities(process):[],[process,workflow?.valid]);
  const filtered=all.filter((item)=>(category==="all"||item.category===category)&&(priority==="all"||item.priority===priority)&&(showDismissed||!dismissed.includes(item.id)));
  if(!process) return <main className="page-content"><div className="card empty-state">Proses tidak ditemukan.</div></main>;
  if(workflow&&!workflow.valid) return <main className="page-content"><ProcessHeader process={process} subtitle="Baseline workflow perlu divalidasi sebelum discovery."/><WorkflowGate processId={process.id} issues={workflow.issues}/></main>;
  const addToScenario=(item:typeof all[number])=>{
    const id=apply(process.id,item.nodeId,item.category,item.activityName,targetScenarioOption==="__new__"?null:targetScenarioOption);
    if(!id){toast.error("Aktivitas baseline tersebut tidak ditemukan pada skenario terpilih. Pilih skenario lain atau buat skenario baru.");return;}
    toast.success(targetScenarioOption==="__new__"?"Opportunity diterapkan ke skenario baru.":"Opportunity diterapkan ke skenario terpilih.");
    router.push(`/app/processes/${process.id}/scenarios?scenario=${id}`);
  };
  return <main className="page-content">
    <ProcessHeader process={process} subtitle="Rule-based discovery untuk mengurutkan area yang layak ditinjau bersama pemilik proses."/>
    <div className="card" style={{ padding:14, marginBottom:15, display:"flex", gap:10, alignItems:"flex-start" }}><div className="stat-icon purple" style={{ margin:0, flex:"0 0 auto" }}><Info size={14}/></div><div><b style={{fontSize:10}}>Opportunity score adalah heuristic prioritization score</b><p className="tiny muted" style={{margin:"4px 0 0",lineHeight:1.6}}>Skor 0–100 membantu mengurutkan aktivitas untuk discovery. Ini bukan probabilitas keberhasilan automasi dan bukan rekomendasi AI. Semua faktor di bawah berasal dari input node.</p></div></div>
    <div className="stat-grid" style={{ marginBottom:15 }}>
      <div className="card stat-card"><div className="metric-label">Opportunities terdeteksi</div><div className="metric-value" style={{marginTop:8}}>{all.length}</div><div className="metric-foot"><span>Berbasis aturan yang tersedia</span></div></div>
      <div className="card stat-card"><div className="metric-label">High priority</div><div className="metric-value" style={{marginTop:8,color:"#15917f"}}>{all.filter((o)=>o.priority==="high").length}</div><div className="metric-foot"><span>Skor 75–100</span></div></div>
      <div className="card stat-card"><div className="metric-label">Medium priority</div><div className="metric-value" style={{marginTop:8,color:"#ba7d20"}}>{all.filter((o)=>o.priority==="medium").length}</div><div className="metric-foot"><span>Skor 55–74</span></div></div>
      <div className="card stat-card"><div className="metric-label">Low priority</div><div className="metric-value" style={{marginTop:8,color:"#777e8f"}}>{all.filter((o)=>o.priority==="low").length}</div><div className="metric-foot"><span>Skor 0–54</span></div></div>
    </div>
    <AiDiscoveryPanel process={process}/>
    <div className="card" style={{padding:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
      <Filter size={14} color="#868d9d"/><label className="tiny muted" htmlFor="opportunity-target">Apply to</label><select id="opportunity-target" aria-label="Pilih skenario To-Be" className="select" value={targetScenarioOption} style={{width:210}} onChange={(e)=>setTargetScenarioId(e.target.value)}><option value="__new__">Buat skenario baru</option>{scenarios.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select><select aria-label="Filter kategori" className="select" value={category} style={{width:170}} onChange={(e)=>setCategory(e.target.value)}><option value="all">Semua kategori</option>{[...new Set(all.map((o)=>o.category))].map((c)=><option key={c}>{c}</option>)}</select>
      <select aria-label="Filter prioritas" className="select" value={priority} style={{width:150}} onChange={(e)=>setPriority(e.target.value)}><option value="all">Semua prioritas</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      <label className="tiny muted" style={{display:"flex",alignItems:"center",gap:6,marginLeft:5}}><input type="checkbox" checked={showDismissed} onChange={(e)=>setShowDismissed(e.target.checked)}/> Tampilkan dismissed</label><span className="tiny muted" style={{marginLeft:"auto"}}>{filtered.length} hasil</span>
    </div>
    <div className="three-col">
      {filtered.map((item)=><article className="card opportunity-card" key={item.id}>
        <div className="opportunity-top"><span className={`pill ${item.priority==="high"?"green":item.priority==="medium"?"amber":"gray"}`}>{item.priority==="high"?"High priority":item.priority==="medium"?"Medium priority":"Low priority"}</span><div className={`score-ring ${item.priority}`}>{item.score}</div></div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:13}}><span className="pill purple">{item.category}</span><span className="tiny muted">Heuristic score</span></div>
        <h3>{item.activityName}</h3><p>{item.explanation}</p>
        <div className="factor-list">{item.factors.map((factor)=><span className="factor-chip" key={factor}>{factor}</span>)}</div>
        <div style={{padding:"9px 10px",background:"#f8f8fc",borderRadius:7,marginBottom:12}}><b style={{fontSize:8,display:"block",marginBottom:4}}>Next action</b><span className="tiny muted" style={{lineHeight:1.5}}>{item.nextAction}</span></div>
        <div className="tiny muted" style={{marginBottom:10}}>Improvement focus: <b style={{color:"#555c6d"}}>{item.focus}</b></div>
        <div className="opportunity-actions"><button className="button primary small" style={{flex:1}} onClick={()=>addToScenario(item)}><Plus size={12}/> Add to scenario</button><button className="button small" title={dismissed.includes(item.id)?"Restore opportunity":"Dismiss"} onClick={()=>dismissed.includes(item.id)?restore(item.id):dismiss(item.id)}>{dismissed.includes(item.id)?<CheckCircle2 size={12}/>:<X size={12}/>} {dismissed.includes(item.id)?"Restore":"Dismiss"}</button></div>
      </article>)}
    </div>
    {!filtered.length && <div className="card empty-state"><Lightbulb size={22} style={{margin:"0 auto 10px",color:"#9993f2"}}/><b style={{display:"block",color:"var(--ink)"}}>Tidak ada opportunity untuk filter ini</b><p>Ubah filter atau lengkapi karakteristik aktivitas di Studio.</p><Link href={`/app/processes/${process.id}/studio`} className="button small">Edit workflow <ArrowRight size={11}/></Link></div>}
    <div className="card card-body" style={{marginTop:17}}><div className="card-head" style={{padding:0}}><div><h2>Opportunity score methodology</h2><p>Faktor dan bobot yang digunakan pada skor aktivitas.</p></div><span className="pill gray">0–100</span></div><div className="two-col" style={{marginTop:14,gap:9}}>
      {[["Monthly volume",20,"min(volume / 500, 1)"],["Manual work intensity",20,"manual = 1 · semi = 0.5 · automated = 0"],["Repeatability",20,"(rating − 1) / 4"],["Standardization",15,"(rating − 1) / 4"],["Waiting time",10,"min(wait minutes / 120, 1)"],["Error impact",10,"(rating − 1) / 4"],["Digital integration readiness",5,"(rating − 1) / 4"]].map(([label,weight,formula])=><div key={String(label)} style={{display:"grid",gridTemplateColumns:"1fr 35px",gap:8,alignItems:"center",padding:"8px 9px",background:"#f8f8fb",borderRadius:7}}><span><b style={{fontSize:9,display:"block"}}>{label}</b><small className="muted" style={{fontSize:8}}>{formula}</small></span><b style={{fontSize:10,textAlign:"right"}}>{weight}%</b></div>)}
    </div><p className="tiny muted" style={{margin:"12px 0 0"}}>Kategori: 75–100 High · 55–74 Medium · 0–54 Low. Input dijepit dalam rentang valid sebelum perhitungan.</p></div>
  </main>;
}
