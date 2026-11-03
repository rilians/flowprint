"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowDownUp, ArrowRight, Check, Copy, FilePlus2, RotateCcw, Trash2, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { ProcessHeader, useCurrentProcess } from "@/components/process-header";
import { useFlowprintStore } from "@/stores/flowprint-store";
import { calculateProcessMetrics, calculateScenarioComparison, cloneGraph } from "@/lib/calculations";
import { money, minutes, number, modeLabels } from "@/lib/format";
import type { FlowNode, WorkflowGraph } from "@/lib/types";
import { validateWorkflow } from "@/lib/validation";
import { WorkflowGate } from "@/components/workflow-gate";
import { ScenarioCanvasEditor } from "@/components/scenario-canvas-editor";
import { AiToBeDraftPanel } from "@/components/ai/tobe-draft-panel";

function ComparisonBar({ label, before, after, suffix="" }: { label:string; before:number; after:number; suffix?:string }) {
  const max=Math.max(1,before,after);
  return <div className="bar-compare"><div className="bar-row"><span>{label}</span><div style={{display:"grid",gap:4}}><div className="bar-track"><span style={{width:`${before/max*100}%`,background:"#a9a6c7"}}/></div><div className="bar-track"><span style={{width:`${after/max*100}%`,background:"#665cf0"}}/></div></div><b style={{fontSize:8,textAlign:"right"}}>{number(before,1)}{suffix} / {number(after,1)}{suffix}</b></div></div>;
}

export function ScenariosView() {
  const process=useCurrentProcess();
  const searchParams=useSearchParams();
  const router=useRouter();
  const allScenarios=useFlowprintStore((s)=>s.scenarios);
  const createScenario=useFlowprintStore((s)=>s.createScenario);
  const updateScenario=useFlowprintStore((s)=>s.updateScenario);
  const deleteScenario=useFlowprintStore((s)=>s.deleteScenario);
  const duplicateScenario=useFlowprintStore((s)=>s.duplicateScenario);
  const [activeId,setActiveId]=useState<string|null>(null);
  const [draftName,setDraftName]=useState("");
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [editorTab,setEditorTab]=useState<"canvas"|"assumptions">("canvas");
  const [canvasRevision,setCanvasRevision]=useState(0);
  const canvasGraphRef=useRef<{scenarioId:string;graph:WorkflowGraph}|null>(null);
  const scenarios=useMemo(()=>allScenarios.filter((s)=>s.processId===process?.id),[allScenarios,process?.id]);
  const requested=searchParams.get("scenario");
  useEffect(()=>{
    const target=requested&&scenarios.some((item)=>item.id===requested)?requested:!activeId||!scenarios.some((item)=>item.id===activeId)?scenarios[0]?.id||null:activeId;
    if(target===activeId)return;
    const current=canvasGraphRef.current;
    if(activeId&&current?.scenarioId===activeId)updateScenario(activeId,{graph:cloneGraph(current.graph)});
    setActiveId(target);
  },[requested,scenarios,activeId,updateScenario]);
  const scenario=scenarios.find((s)=>s.id===activeId)||null;
  const switchScenario=(id:string)=>{
    if(scenario&&canvasGraphRef.current?.scenarioId===scenario.id) updateScenario(scenario.id,{graph:cloneGraph(canvasGraphRef.current.graph)});
    setActiveId(id);
    router.replace(`/app/processes/${process?.id}/scenarios?scenario=${id}`);
  };
  const workflow=process?validateWorkflow(process.graph):null;
  const scenarioValidation=scenario?validateWorkflow(scenario.graph):null;
  const comparison=process&&workflow?.valid&&scenario&&scenarioValidation?.valid?calculateScenarioComparison(process,scenario):null;
  if(!process) return <main className="page-content"><div className="card empty-state">Proses tidak ditemukan.</div></main>;
  if(workflow&&!workflow.valid) return <main className="page-content"><ProcessHeader process={process} subtitle="Baseline workflow perlu divalidasi sebelum simulasi."/><WorkflowGate processId={process.id} issues={workflow.issues}/></main>;

  const makeNew=()=>{
    if(scenario&&canvasGraphRef.current?.scenarioId===scenario.id) updateScenario(scenario.id,{graph:cloneGraph(canvasGraphRef.current.graph)});
    const id=createScenario(process.id,`Skenario ${scenarios.length+1}`);
    if(id){setActiveId(id);setDraftName("");toast.success("Skenario baru dibuat sebagai salinan baseline.");router.replace(`/app/processes/${process.id}/scenarios?scenario=${id}`);}
  };
  const saveName=()=>{
    if(!scenario) return;
    const name=draftName.trim();
    if(name) updateScenario(scenario.id,{name});
    setDraftName("");
  };
  const updateGraph=(nodeId:string, changes:Partial<FlowNode["data"]>)=>{
    if(!scenario) return;
    const graph:WorkflowGraph={...scenario.graph,nodes:scenario.graph.nodes.map((node)=>node.id===nodeId?{...node,data:{...node.data,...changes}}:node)};
    updateScenario(scenario.id,{graph});
  };
  const resetToBaseline=()=>{
    if(!scenario) return;
    canvasGraphRef.current=null;
    updateScenario(scenario.id,{graph:cloneGraph(process.graph)});
    setCanvasRevision((revision)=>revision+1);
    toast.success("Workflow To-Be dikembalikan ke baseline—baseline tidak berubah.");
  };
  const showAssumptions=()=>{
    if(scenario&&canvasGraphRef.current?.scenarioId===scenario.id) updateScenario(scenario.id,{graph:cloneGraph(canvasGraphRef.current.graph)});
    setEditorTab("assumptions");
  };
  const duplicate=()=>{
    if(!scenario) return;
    if(canvasGraphRef.current?.scenarioId===scenario.id) updateScenario(scenario.id,{graph:cloneGraph(canvasGraphRef.current.graph)});
    const id=duplicateScenario(scenario.id);
    if(id){setActiveId(id);router.replace(`/app/processes/${process.id}/scenarios?scenario=${id}`);toast.success("Skenario berhasil diduplikasi.");}
  };
  const saveRename=()=>{
    saveName();
    const name=draftName.trim();
    if(name) toast.success("Nama skenario diperbarui.");
  };

  const baseline=calculateProcessMetrics(process.graph,process.monthlyVolume,process.hourlyLaborCost);
  const currentProposed=scenario?calculateProcessMetrics(scenario.graph,process.monthlyVolume,process.hourlyLaborCost):null;
  const nodeOrder=(graph:WorkflowGraph)=>[...graph.nodes].filter((n)=>n.type==="activity"||n.type==="wait").sort((a,b)=>a.position.y-b.position.y);

  return <main className="page-content">
    <ProcessHeader process={process} subtitle="Rancang proses target tanpa mengubah baseline As-Is, lalu bandingkan dampak berdasarkan asumsi."/>
    <div className="card" style={{padding:"11px 14px",marginBottom:14,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><span className="pill purple">Scenario simulator</span><span className="tiny muted">Semua output adalah estimasi dari asumsi workflow, volume, biaya, dan tingkat adopsi.</span><Link href={`/app/processes/${process.id}/opportunities`} className="button small" style={{marginLeft:"auto"}}>Find opportunities <ArrowRight size={11}/></Link></div>
    <div className="scenario-layout">
      <aside className="card">
        <div className="card-head"><div><h2>Scenarios</h2><p>{scenarios.length} tersimpan</p></div><button className="icon-button" onClick={makeNew} title="Buat skenario"><FilePlus2 size={14}/></button></div>
        <div className="scenario-list">
          {scenarios.map((item)=><button key={item.id} className={`scenario-item ${item.id===activeId?"active":""}`} onClick={()=>switchScenario(item.id)} style={{width:"100%",textAlign:"left",background:"transparent"}}><b>{item.name}</b><span>{item.id.startsWith("demo")?"Illustrative demo":"User scenario"} · {number(item.adoptionRate*100)}% adoption</span></button>)}
          {!scenarios.length&&<div className="empty-state" style={{padding:"24px 10px"}}>Belum ada skenario. Buat salinan baseline untuk mulai.</div>}
        </div>
        <div style={{padding:"0 12px 12px"}}><button className="button primary small" onClick={makeNew} style={{width:"100%"}}><FilePlus2 size={12}/> Buat skenario</button></div>
      </aside>
      {!scenario ? <div className="card empty-state"><ArrowDownUp size={24} style={{margin:"0 auto 10px",color:"#928cf0"}}/><b style={{display:"block",color:"var(--ink)"}}>Mulai dengan To-Be</b><p>Buat skenario baru. Baseline akan disalin dan tetap terlindungi.</p><button className="button primary small" onClick={makeNew}>Buat skenario <ArrowRight size={12}/></button></div> : <div style={{display:"grid",gap:14,minWidth:0}}>
        <section className="card scenario-editor">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}><div style={{flex:1,minWidth:220}}><div className="eyebrow">To-Be scenario</div><h2 style={{fontSize:17,margin:"4px 0 7px"}}>{scenario.name}</h2><textarea aria-label="Deskripsi skenario" className="input" rows={2} style={{width:"100%",maxWidth:650,resize:"vertical",fontSize:10,lineHeight:1.5}} value={scenario.description} onChange={(e)=>updateScenario(scenario.id,{description:e.target.value})} placeholder="Deskripsikan perubahan target…"/></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="button small" onClick={duplicate}><Copy size={12}/> Duplicate</button><button className="button small" onClick={resetToBaseline}><RotateCcw size={12}/> Return to baseline</button><button className="button small danger" onClick={()=>setConfirmDelete(true)}><Trash2 size={12}/></button></div></div>
          <div style={{display:"flex",gap:7,marginTop:15,alignItems:"center"}}><input aria-label="Nama skenario baru" className="input" style={{maxWidth:280}} value={draftName} onChange={(e)=>setDraftName(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter") saveRename();}} placeholder="Rename scenario…"/><button className="button small" onClick={saveRename}><Check size={12}/> Rename</button><span className="tiny muted">Auto-saved · cloud sync follows account</span></div>
          <div className="assumption-row">
            <div className="form-field" style={{margin:0}}><label htmlFor="adoption">Tingkat adopsi · {number(scenario.adoptionRate*100)}%</label><input id="adoption" type="range" min="0" max="100" value={Math.round(scenario.adoptionRate*100)} onChange={(e)=>updateScenario(scenario.id,{adoptionRate:Number(e.target.value)/100})}/><div className="metric-foot"><span>0% · no adoption</span><span>100% · full adoption</span></div></div>
            <div className="form-field" style={{margin:0}}><label htmlFor="cost">Biaya implementasi one-time (IDR)</label><input id="cost" className="input" type="number" min="0" step="1000000" value={scenario.implementationCost} onChange={(e)=>updateScenario(scenario.id,{implementationCost:Math.max(0,Number(e.target.value))})}/><small className="muted" style={{fontSize:8}}>Input asumsi, bukan quotation.</small></div>
          </div>
        </section>
        <section className="card" style={{padding:14}}>
          <div className="card-head" style={{padding:0,marginBottom:12}}><div><h2>To-Be workflow editor</h2><p>Canvas untuk menambah, menyusun, menghubungkan, dan mengubah node target. Baseline As-Is tetap utuh.</p></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className={`button small ${editorTab==="canvas"?"primary":""}`} onClick={()=>setEditorTab("canvas")}>Canvas</button><button className={`button small ${editorTab==="assumptions"?"primary":""}`} onClick={showAssumptions}>Quick assumptions</button></div></div>
          {!scenarioValidation?.valid&&<div className="warning-banner" style={{marginBottom:12}}><b>Simulasi belum tersedia — validasi To-Be terlebih dahulu.</b><div style={{marginTop:4}}>{scenarioValidation?.issues.join(" · ")}</div></div>}
          {editorTab==="canvas"&&<AiToBeDraftPanel key={`ai-draft-${scenario.id}-${canvasRevision}`} process={process} getCurrentGraph={()=>canvasGraphRef.current?.scenarioId===scenario.id?canvasGraphRef.current.graph:scenario.graph} onApply={(graph)=>{canvasGraphRef.current=null;updateScenario(scenario.id,{graph});setCanvasRevision((revision)=>revision+1);toast.success("Draft AI diterapkan ke To-Be. Tinjau kembali semua asumsi sebelum digunakan.");}}/>}
          {editorTab==="canvas"?<ScenarioCanvasEditor key={`canvas-${scenario.id}-${canvasRevision}`} scenario={scenario} graphRef={canvasGraphRef}/>: <div className="table-wrap"><table className="data-table"><thead><tr><th>Aktivitas / wait</th><th>Owner</th><th>Mode</th><th>Effort · mnt</th><th>Wait · mnt</th><th>Baseline effort</th></tr></thead><tbody>{nodeOrder(scenario.graph).map((node)=>{
            const base=process.graph.nodes.find((n)=>n.id===node.id);
            return <tr key={node.id}><td><b>{node.data.label}</b><div className="tiny muted">{node.type==="wait"?"Waiting node":"Activity"}</div></td><td><input className="input" style={{width:112,padding:"6px 7px"}} value={node.data.ownerRole} onChange={(e)=>updateGraph(node.id,{ownerRole:e.target.value})}/></td><td>{node.type==="activity"?<select className="select" style={{minWidth:118,padding:"6px 7px"}} value={node.data.workMode} onChange={(e)=>updateGraph(node.id,{workMode:e.target.value as FlowNode["data"]["workMode"]})}><option value="manual">Manual</option><option value="semi_automated">Semi-otomatis</option><option value="automated">Otomatis</option></select>:<span className="pill amber">Waiting</span>}</td><td>{node.type==="activity"?<input className="input" type="number" min="0" style={{width:82,padding:"6px 7px"}} value={node.data.effortMinutes} onChange={(e)=>updateGraph(node.id,{effortMinutes:Math.max(0,Number(e.target.value))})}/>:"—"}</td><td>{node.type==="wait"||node.data.waitMinutes>0?<input className="input" type="number" min="0" style={{width:82,padding:"6px 7px"}} value={node.data.waitMinutes} onChange={(e)=>updateGraph(node.id,{waitMinutes:Math.max(0,Number(e.target.value))})}/>:<span className="muted">0</span>}</td><td className="muted">{base?minutes(base.data.effortMinutes):"New node"}</td></tr>;
          })}</tbody></table></div>}
        </section>
        {comparison && <>
          {comparison.positiveSavings ? <div className="positive-banner"><div><b>{number(comparison.monthlyHoursSaved,1)} jam berpotensi dihemat / bulan</b><span style={{display:"block",marginTop:4}}>Setelah memperhitungkan tingkat adopsi {number(scenario.adoptionRate*100)}% · estimasi</span></div><div style={{textAlign:"right"}}><b>{money(comparison.monthlyCostSaved)}</b><span style={{display:"block",marginTop:4}}>potensi biaya / bulan</span></div></div> : <div className="warning-banner">Saat ini skenario tidak menghasilkan penghematan positif setelah asumsi adopsi diterapkan. Periksa effort To-Be, tingkat adopsi, dan perubahan ruang lingkup; payback period tidak ditampilkan.</div>}
          <div className="comparison-grid">
            <section className="card comparison-card"><div className="card-head" style={{padding:0}}><div><h2>Before vs after</h2><p>Baseline dibandingkan dengan rancangan To-Be.</p></div><span className="pill green">Illustrative estimates</span></div>
              <div className="compare-values"><div className="compare-value"><span>Human effort / run</span><b>{minutes(comparison.baseline.humanEffortMinutes)} <span className="muted" style={{fontSize:11}}>→ {minutes(comparison.proposed.humanEffortMinutes)}</span></b></div><div className="compare-value"><span>Waiting / run</span><b>{minutes(comparison.baseline.waitingMinutes)} <span className="muted" style={{fontSize:11}}>→ {minutes(comparison.proposed.waitingMinutes)}</span></b></div><div className="compare-value"><span>Monthly labor hours</span><b>{number(comparison.baseline.monthlyHours,1)} → {number(comparison.proposed.monthlyHours,1)}</b></div><div className="compare-value"><span>Monthly labor cost</span><b style={{fontSize:13}}>{money(comparison.baseline.monthlyCost)} → {money(comparison.proposed.monthlyCost)}</b></div></div>
              <ComparisonBar label="Effort / run" before={comparison.baseline.humanEffortMinutes} after={comparison.proposed.humanEffortMinutes} suffix=" m"/><ComparisonBar label="Waiting / run" before={comparison.baseline.waitingMinutes} after={comparison.proposed.waitingMinutes} suffix=" m"/><ComparisonBar label="Monthly hours" before={comparison.baseline.monthlyHours} after={comparison.proposed.monthlyHours} suffix=" h"/>
            </section>
            <section className="card comparison-card"><div className="card-head" style={{padding:0}}><div><h2>Business case</h2><p>Calculated from provided volume, cost, and adoption assumptions.</p></div><TrendingDown size={15} color="#16a394"/></div>
              <div style={{marginTop:15,display:"grid",gap:9}}>
                <div className="compare-value"><span>Raw monthly hours delta · before adoption</span><b>{number(comparison.rawMonthlyHoursDelta,1)} jam</b></div>
                <div className="compare-value"><span>Potential cost savings / month</span><b style={{color:comparison.positiveSavings?"#128b7e":"#747b8f"}}>{money(Math.max(0,comparison.monthlyCostSaved))}</b></div>
                <div className="compare-value"><span>One-time implementation cost</span><b>{money(scenario.implementationCost)}</b></div>
                <div className="compare-value"><span>Estimated payback period</span><b>{comparison.paybackMonths===null?"—":comparison.paybackMonths===0?"Immediate":`${number(comparison.paybackMonths,1)} bulan`}</b></div>
              </div>
              <p className="tiny muted" style={{lineHeight:1.6}}>Formula: (baseline monthly hours − proposed monthly hours) × adoption rate. Payback = one-time cost ÷ estimated monthly cost savings. Belum memperhitungkan biaya lisensi, perubahan kebijakan, atau maintenance.</p>
            </section>
          </div>
          <div className="metric-foot"><span>Current: {baseline.activityCount} activities · {baseline.manualCount} manual</span><span>Proposed: {currentProposed?.activityCount} activities · {currentProposed?.manualCount} manual · {currentProposed?.automatedCount} automated</span></div>
        </>}
      </div>}
    </div>
    {confirmDelete && scenario && <div className="modal-backdrop"><div className="modal"><h2>Hapus skenario?</h2><p>Baseline proses tidak terpengaruh. Skenario “{scenario.name}” akan dihapus dari workspace aktif.</p><div className="modal-actions"><button className="button" onClick={()=>setConfirmDelete(false)}>Batal</button><button className="button danger" onClick={()=>{deleteScenario(scenario.id);setActiveId(null);setConfirmDelete(false);router.replace(`/app/processes/${process.id}/scenarios`);toast.success("Skenario dihapus.");}}>Hapus skenario</button></div></div></div>}
  </main>;
}
