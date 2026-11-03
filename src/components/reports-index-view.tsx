"use client";
import Link from "next/link";
import { FileBarChart2, ArrowRight, CalendarDays, TriangleAlert } from "lucide-react";
import { useFlowprintStore } from "@/stores/flowprint-store";
import { calculateProcessMetrics } from "@/lib/calculations";
import { minutes, number } from "@/lib/format";
import { validateWorkflow } from "@/lib/validation";

export function ReportsIndexView(){
  const processes=useFlowprintStore((s)=>s.processes);
  return <main className="page-content"><div className="page-heading"><div><div className="eyebrow">Executive reporting</div><h1>Reports</h1><p>Pilih proses untuk membuka report preview dan export.</p></div></div>
    <div className="process-grid">{processes.map((p)=>{
      const valid=validateWorkflow(p.graph).valid;
      const metrics=valid?calculateProcessMetrics(p.graph,p.monthlyVolume,p.hourlyLaborCost):null;
      return <Link key={p.id} href={`/app/processes/${p.id}/reports`} className="card process-card"><div className="process-card-top"><div className="process-icon"><FileBarChart2 size={17}/></div><span className={`pill ${valid?"green":"amber"}`}>{valid?<><CalendarDays size={10}/> Print-ready</>:<><TriangleAlert size={10}/> Needs validation</>}</span></div><h3>{p.name}</h3><p>{p.description}</p><div className="process-card-footer"><span>{p.department}</span><span>{metrics?`${number(metrics.activityCount)} aktivitas`:"Workflow invalid"}</span><span>{metrics?`${minutes(metrics.humanEffortMinutes)} / run`:"—"}</span></div><div style={{display:"flex",justifyContent:"flex-end",marginTop:11}}><span className="button small">Open report <ArrowRight size={12}/></span></div></Link>;
    })}</div>
    {!processes.length&&<div className="card empty-state">Belum ada proses untuk dibuatkan report.</div>}
  </main>;
}
