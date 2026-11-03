"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Download, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ProcessHeader, useCurrentProcess } from "@/components/process-header";
import { useFlowprintStore } from "@/stores/flowprint-store";
import { calculateProcessMetrics, calculateScenarioComparison } from "@/lib/calculations";
import { generateOpportunities } from "@/lib/recommendations";
import { minutes, money, number, modeLabels } from "@/lib/format";
import { validateWorkflow } from "@/lib/validation";
import { WorkflowGate } from "@/components/workflow-gate";
import type { WorkflowGraph } from "@/lib/types";

function FlowDiagram({ graph, label }: {graph:WorkflowGraph;label:string}) {
  const ordered=[...graph.nodes].sort((a,b)=>a.position.y-b.position.y);
  return <div><div className="tiny muted" style={{marginBottom:5}}>{label}</div><div className="report-flow">{ordered.map((node,index)=><span key={node.id} style={{display:"contents"}}>{index>0&&<span className="report-arrow">→</span>}<span className="report-flow-node"><small>{node.type==="activity"?modeLabels[node.data.workMode]:node.type==="wait"?"WAIT":node.type.toUpperCase()}</small><b>{node.data.label}</b>{(node.type==="activity"||node.type==="wait")&&<small style={{marginTop:4}}>{node.type==="wait"?minutes(node.data.waitMinutes):`${minutes(node.data.effortMinutes)} effort`}{node.data.waitMinutes>0&&node.type==="activity"?` · +${minutes(node.data.waitMinutes)} wait`:""}</small>}</span></span>)}</div></div>;
}
function downloadFile(name:string,content:string,mime:string) {
  const blob=new Blob([content],{type:mime}); const url=URL.createObjectURL(blob); const anchor=document.createElement("a"); anchor.href=url; anchor.download=name; anchor.click(); URL.revokeObjectURL(url);
}
function csvCell(value:unknown) { return `"${String(value??"").replaceAll('"','""')}"`; }

export function ReportView() {
  const process=useCurrentProcess();
  const allScenarios=useFlowprintStore((s)=>s.scenarios);
  const scenarios=useMemo(()=>allScenarios.filter((s)=>s.processId===process?.id),[allScenarios,process?.id]);
  const [selectedScenarioId,setSelectedScenarioId]=useState<string|null>(null);
  const scenarioOption=selectedScenarioId==="__none__"?"__none__":scenarios.some((item)=>item.id===selectedScenarioId)?selectedScenarioId||"__none__":scenarios[0]?.id||"__none__";
  const scenario=scenarios.find((item)=>item.id===scenarioOption)||null;
  const workflow=process?validateWorkflow(process.graph):null;
  const opportunities=useMemo(()=>process&&workflow?.valid?generateOpportunities(process):[],[process,workflow?.valid]);
  if(!process) return <main className="page-content"><div className="card empty-state">Proses tidak ditemukan.</div></main>;
  if(workflow&&!workflow.valid) return <main className="page-content"><ProcessHeader process={process} subtitle="Baseline workflow perlu divalidasi sebelum laporan dibuat."/><WorkflowGate processId={process.id} issues={workflow.issues}/></main>;
  const metrics=calculateProcessMetrics(process.graph,process.monthlyVolume,process.hourlyLaborCost);
  const scenarioValidation=scenario?validateWorkflow(scenario.graph):null;
  const comparison=scenario&&scenarioValidation?.valid?calculateScenarioComparison(process,scenario):null;
  const reportDate=new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date());
  const exportJson=()=>{
    downloadFile(`${process.id}-analysis.json`,JSON.stringify({exportedAt:new Date().toISOString(),process,scenario,metrics,opportunities},null,2),"application/json");
    toast.success("JSON export berhasil diunduh.");
  };
  const exportCsv=()=>{
    const rows=[
      ["FLOWPRINT report",process.name],
      ["Reporting date",reportDate],
      ["Department",process.department],
      ["Metric","Baseline","To-Be","Unit"],
      ["Activities",metrics.activityCount,comparison?.proposed.activityCount??"","count"],
      ["Human effort",metrics.humanEffortMinutes,comparison?.proposed.humanEffortMinutes??"","minutes / run"],
      ["Waiting time",metrics.waitingMinutes,comparison?.proposed.waitingMinutes??"","minutes / run"],
      ["Monthly workload",metrics.monthlyHours,comparison?.proposed.monthlyHours??"","hours / month"],
      ["Monthly labor cost",metrics.monthlyCost,comparison?.proposed.monthlyCost??"","IDR / month"],
      ["Estimated hours saved",comparison?.monthlyHoursSaved??"","","hours / month after adoption"],
      ["Estimated cost savings",comparison?.monthlyCostSaved??"","","IDR / month after adoption"],
      ["Opportunity","Score","Priority","Category"],
      ...opportunities.map((item)=>[item.activityName,item.score,item.priority,item.category]),
    ];
    downloadFile(`${process.id}-metrics.csv`,rows.map((row)=>row.map(csvCell).join(",")).join("\n"),"text/csv;charset=utf-8");
    toast.success("CSV export berhasil diunduh.");
  };
  return <main className="page-content">
    <ProcessHeader process={process} subtitle="Laporan eksekutif berisi baseline, temuan, rekomendasi, dan estimasi dampak."/>
    <div className="card no-print" style={{padding:12,marginBottom:15,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><span className="pill purple">Executive report preview</span><span className="tiny muted">Format print A4 · estimasi dipisahkan dari input.</span><label className="tiny muted" htmlFor="report-scenario" style={{marginLeft:"auto"}}>To-Be scenario</label><select id="report-scenario" aria-label="Pilih skenario untuk laporan" className="select" value={scenarioOption} onChange={(e)=>setSelectedScenarioId(e.target.value)} style={{maxWidth:220}}><option value="__none__">Baseline only</option>{scenarios.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select><span style={{display:"flex",gap:7}}><button className="button small" onClick={exportJson}><Download size={12}/> JSON</button><button className="button small" onClick={exportCsv}><Download size={12}/> CSV</button><button className="button primary small" onClick={()=>window.print()}><Printer size={12}/> Print / Save as PDF</button></span></div>
    <article className="report-page">
      <header className="report-cover"><div className="report-mark">FLOWPRINT / PROCESS INTELLIGENCE</div><span className="pill purple" style={{marginTop:20}}>Executive process review</span><h1>{process.name}</h1><p>{process.description}</p><div style={{display:"flex",gap:26,flexWrap:"wrap",marginTop:28}}><div><small className="muted">DEPARTMENT</small><b style={{display:"block",fontSize:11,marginTop:4}}>{process.department}</b></div><div><small className="muted">REPORTING DATE</small><b style={{display:"block",fontSize:11,marginTop:4}}>{reportDate}</b></div><div><small className="muted">MONTHLY VOLUME</small><b style={{display:"block",fontSize:11,marginTop:4}}>{number(process.monthlyVolume)} executions</b></div></div><div className="report-note" style={{marginTop:24}}>Report ini dihasilkan dari input proses dan asumsi demo. Angka operasional dan finansial adalah ilustratif, bukan pengukuran atau komitmen hasil.</div></header>
      <section className="report-section"><h2>01 / Executive summary</h2><p>Proses <b>{process.name}</b> memiliki {metrics.activityCount} aktivitas operasional yang tercatat. Human effort baseline sebesar <b>{minutes(metrics.humanEffortMinutes)} per eksekusi</b> dan waktu tunggu sebesar <b>{minutes(metrics.waitingMinutes)}</b>, menghasilkan estimasi beban kerja {number(metrics.monthlyHours,1)} jam per bulan pada volume {number(process.monthlyVolume)} eksekusi.</p><p>{opportunities.length} opportunity berbasis aturan teridentifikasi untuk ditinjau. Rekomendasi merupakan sinyal discovery, bukan prediksi keberhasilan automasi. Validasi setiap temuan bersama pemilik proses sebelum perubahan dijalankan.</p></section>
      <section className="report-section"><h2>02 / Process overview</h2><div className="report-metrics"><div className="report-metric"><span>Total activities</span><b>{metrics.activityCount}</b></div><div className="report-metric"><span>Human effort / run</span><b>{minutes(metrics.humanEffortMinutes)}</b></div><div className="report-metric"><span>Waiting / run</span><b>{minutes(metrics.waitingMinutes)}</b></div><div className="report-metric"><span>Cycle time / run</span><b>{minutes(metrics.cycleMinutes)}</b></div><div className="report-metric"><span>Monthly workload</span><b>{number(metrics.monthlyHours,1)} jam</b></div><div className="report-metric"><span>Monthly labor cost</span><b style={{fontSize:11}}>{money(metrics.monthlyCost)}</b></div><div className="report-metric"><span>Manual activities</span><b>{metrics.manualCount}</b></div><div className="report-metric"><span>Monthly volume</span><b>{number(process.monthlyVolume)}</b></div></div><div className="report-note" style={{marginTop:9}}>Input assumptions: hourly labor cost {money(process.hourlyLaborCost)}, volume {number(process.monthlyVolume)} per month. Calculated metrics use the methodology described at the end of this report.</div></section>
      <section className="report-section"><h2>03 / As-Is workflow</h2><FlowDiagram graph={process.graph} label="Baseline · current state"/></section>
      <section className="report-section"><h2>04 / Bottleneck analysis</h2>{opportunities.length?<ul style={{paddingLeft:16,margin:0}}>{opportunities.slice(0,6).map((item)=><li key={item.id} style={{fontSize:9,lineHeight:1.65,marginBottom:7}}><b>{item.activityName} · {item.category} · score {item.score}</b><br/><span style={{color:"#747b8f"}}>{item.explanation} Next action: {item.nextAction}</span></li>)}</ul>:<p>Belum ada opportunity berdasarkan aturan saat ini. Lengkapi karakteristik aktivitas untuk menghasilkan discovery yang lebih representatif.</p>}</section>
      <section className="report-section"><h2>05 / Automation opportunity matrix</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Aktivitas</th><th>Score*</th><th>Priority</th><th>Category</th><th>Focus</th></tr></thead><tbody>{opportunities.map((item)=><tr key={item.id}><td>{item.activityName}</td><td>{item.score}/100</td><td>{item.priority}</td><td>{item.category}</td><td>{item.focus}</td></tr>)}</tbody></table></div><div className="report-note">*Skor adalah heuristic prioritization score 0–100, bukan probabilitas keberhasilan automasi.</div></section>
      <section className="report-section"><h2>06 / To-Be workflow & impact</h2>{scenario&&comparison?<><p>Skenario yang dipilih: <b>{scenario.name}</b>. Adopsi {number(scenario.adoptionRate*100)}%, biaya implementasi asumsi {money(scenario.implementationCost)}.</p><FlowDiagram graph={scenario.graph} label="Proposed target state"/><div className="report-metrics" style={{marginTop:12}}><div className="report-metric"><span>Effort / run</span><b>{minutes(comparison.baseline.humanEffortMinutes)} → {minutes(comparison.proposed.humanEffortMinutes)}</b></div><div className="report-metric"><span>Waiting / run</span><b>{minutes(comparison.baseline.waitingMinutes)} → {minutes(comparison.proposed.waitingMinutes)}</b></div><div className="report-metric"><span>Potential hours saved / month</span><b>{number(Math.max(0,comparison.monthlyHoursSaved),1)}</b></div><div className="report-metric"><span>Potential cost saved / month</span><b style={{fontSize:11}}>{money(Math.max(0,comparison.monthlyCostSaved))}</b></div></div><p>Estimated payback: {comparison.paybackMonths===null?"not available (no positive savings)":comparison.paybackMonths===0?"immediate":`${number(comparison.paybackMonths,1)} months`}.</p></>:<div className="report-note">{scenario?<>Skenario “{scenario.name}” belum valid untuk perbandingan: {scenarioValidation?.issues.join(" · ")}. Perbaiki alur To-Be terlebih dahulu. <Link href={`/app/processes/${process.id}/scenarios?scenario=${scenario.id}`}>Perbaiki skenario →</Link></>:<>Belum ada To-Be scenario untuk proses ini. Buat skenario pada Scenario Simulator untuk menyertakan perbandingan before/after dalam laporan. <Link href={`/app/processes/${process.id}/scenarios`}>Buka simulator →</Link></>}</div>}</section>
      <section className="report-section"><h2>07 / Methodology & assumptions</h2><ul style={{paddingLeft:16,color:"#5f6678",fontSize:9,lineHeight:1.8}}><li>Human effort = jumlah effort menit pada seluruh Activity node.</li><li>Waiting time = waktu tunggu pada Waiting node dan Activity node.</li><li>Cycle time = human effort + waiting time; tidak termasuk variasi atau parallel execution.</li><li>Monthly workload = (human effort ÷ 60) × monthly volume.</li><li>Monthly labor cost = monthly workload × hourly labor cost input.</li><li>Potential hours saved = (baseline monthly hours − proposed monthly hours) × adoption rate.</li><li>Skor opportunity memakai bobot volume, manual intensity, repetisi, standardisasi, waiting, error impact, dan integration readiness.</li><li>Semua hasil merupakan estimasi berbasis input. Tidak ada event log, time study, atau data aktual yang terhubung.</li></ul></section>
      <section className="report-section"><h2>08 / Recommended next steps</h2><ol style={{paddingLeft:17,color:"#5f6678",fontSize:9,lineHeight:1.85}}><li>Validasi baseline dan definisi start/end bersama process owner.</li><li>Kumpulkan data durasi aktual, variasi kasus, volume, dan rework.</li><li>Prioritaskan satu opportunity untuk discovery, termasuk exception dan kontrol.</li><li>Review skenario To-Be dengan pemilik fungsi, IT, dan compliance.</li><li>Ukur dampak melalui pilot sebelum mengklaim benefit atau melakukan rollout.</li></ol></section>
      <footer style={{borderTop:"1px solid #e8eaf1",paddingTop:12,marginTop:25,color:"#9298a7",fontSize:8,display:"flex",justifyContent:"space-between",gap:10}}><span>FLOWPRINT · Internal process improvement concept</span><span>Illustrative, estimate-based analysis</span></footer>
    </article>
  </main>;
}
