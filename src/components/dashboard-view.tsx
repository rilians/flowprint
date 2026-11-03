"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3, FileCheck2, Gauge, Layers3, Plus, Sparkles, Workflow, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { calculateProcessMetrics, calculateScenarioComparison } from "@/lib/calculations";
import { generateOpportunities } from "@/lib/recommendations";
import { validateWorkflow } from "@/lib/validation";
import { money, number } from "@/lib/format";
import { useFlowprintStore } from "@/stores/flowprint-store";

export function DashboardView() {
  const processes = useFlowprintStore((s) => s.processes);
  const scenarios = useFlowprintStore((s) => s.scenarios);
  const opportunities = useMemo(() => processes.flatMap((p) => validateWorkflow(p.graph).valid ? generateOpportunities(p) : []), [processes]);
  const savedHours = useMemo(() => {
    const bestByProcess = new Map<string, number>();
    scenarios.forEach((scenario) => {
      const process = processes.find((p) => p.id === scenario.processId);
      if (!process || !validateWorkflow(process.graph).valid) return;
      const saved = Math.max(0, calculateScenarioComparison(process, scenario).monthlyHoursSaved);
      bestByProcess.set(process.id, Math.max(bestByProcess.get(process.id) || 0, saved));
    });
    return [...bestByProcess.values()].reduce((sum, value) => sum + value, 0);
  }, [processes, scenarios]);
  const monthlyWorkload = useMemo(() => processes.filter((p) => validateWorkflow(p.graph).valid).map((p) => ({ process: p, metrics: calculateProcessMetrics(p.graph, p.monthlyVolume, p.hourlyLaborCost) })), [processes]);
  const highPriority = opportunities.filter((item) => item.priority === "high").length;
  const [today,setToday] = useState("");
  useEffect(() => { setToday(new Intl.DateTimeFormat("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" }).format(new Date())); }, []);

  return <main className="page-content">
    <div className="page-heading">
      <div><div className="eyebrow">{today ? `${today} · ` : ""}Workspace / Northstar</div><h1>Selamat datang kembali.</h1><p>Gambaran ringkas proses dan peluang improvement yang sedang Anda eksplorasi.</p></div>
      <div className="quick-links"><Link href="/app/processes/new" className="button primary"><Plus size={14}/> Proses baru</Link></div>
    </div>
    <div className="stat-grid">
      <div className="card stat-card"><div className="stat-icon purple"><Workflow size={15}/></div><div className="stat-row"><div><div className="metric-value">{number(processes.length)}</div><div className="metric-label">Total proses</div></div><span className="pill gray">Library</span></div><div className="metric-foot"><span>Seluruh proses di workspace</span><Link href="/app/processes" aria-label="Buka library"><ArrowUpRight size={13}/></Link></div></div>
      <div className="card stat-card"><div className="stat-icon teal"><FileCheck2 size={15}/></div><div className="stat-row"><div><div className="metric-value">{number(processes.filter((p) => p.analysisStatus === "analyzed" && validateWorkflow(p.graph).valid).length)}</div><div className="metric-label">Proses dianalisis</div></div><span className="pill green">Data tersedia</span></div><div className="metric-foot"><span>Berbasis graph workflow</span><span>of {processes.length} processes</span></div></div>
      <div className="card stat-card"><div className="stat-icon amber"><Zap size={15}/></div><div className="stat-row"><div><div className="metric-value">{number(highPriority)}</div><div className="metric-label">Peluang prioritas tinggi</div></div><span className="pill amber">Heuristik</span></div><div className="metric-foot"><span>Skor prioritas ≥ 75</span><Link href="/app/processes" aria-label="Lihat peluang"><ArrowUpRight size={13}/></Link></div></div>
      <div className="card stat-card"><div className="stat-icon red"><Clock3 size={15}/></div><div className="stat-row"><div><div className="metric-value">{number(savedHours, 1)}<span style={{ fontSize:12, color:"#8b90a0", marginLeft:4 }}>jam</span></div><div className="metric-label">Potensi hemat / bulan</div></div><span className="pill purple">Estimasi</span></div><div className="metric-foot"><span>Skenario terbaik tiap proses</span><Link href="/app/processes/employee-reimbursement/scenarios" aria-label="Buka simulator"><ArrowUpRight size={13}/></Link></div></div>
    </div>

    <div className="dashboard-grid" style={{ marginTop:19 }}>
      <section className="card">
        <div className="card-head"><div><h2>Proses terbaru</h2><p>Perubahan terakhir di process library Anda.</p></div><Link href="/app/processes" className="button ghost small">Lihat semua <ArrowRight size={12}/></Link></div>
        <div className="card-body" style={{ paddingTop:8 }}>
          {processes.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0,4).map((process) => {
            const metric = calculateProcessMetrics(process.graph, process.monthlyVolume, process.hourlyLaborCost);
            return <div className="process-row" key={process.id}>
              <Link href={`/app/processes/${process.id}`}><div className="process-title">{process.name}</div><div className="process-meta">{process.department} · {metric.activityCount} aktivitas</div></Link>
              <span className="process-volume muted tiny">{number(process.monthlyVolume)} / bln</span>
              <span className={`pill ${process.analysisStatus === "analyzed" ? "green" : "gray"}`}>{process.analysisStatus === "analyzed" ? "Analyzed" : "Draft"}</span>
              <div className="process-bar"><div className="progress"><span style={{ width:`${Math.min(100, Math.max(8, metric.manualCount / Math.max(1, metric.activityCount) * 100))}%` }}/></div><div className="process-meta">{metric.manualCount} manual</div></div>
              <Link href={`/app/processes/${process.id}`} aria-label={`Buka ${process.name}`}><ArrowUpRight size={13} color="#9298a7"/></Link>
            </div>;
          })}
          {!processes.length && <div className="empty-state">Belum ada proses. Buat proses pertama untuk mulai memetakan workflow.</div>}
        </div>
      </section>
      <section className="card">
        <div className="card-head"><div><h2>Aktivitas workspace</h2><p>Snapshot dari data yang tersimpan lokal.</p></div><span className="pill amber">Demo</span></div>
        <div className="card-body"><div className="activity-list">
          {processes.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0,4).map((process) => <div className="activity-line" key={process.id}><div className="activity-mark"><Layers3 size={12}/></div><div><b>{process.name}</b><span>Diperbarui {formatDistanceToNow(new Date(process.updatedAt), { addSuffix:true, locale:id })} · {process.department}</span></div></div>)}
          <div className="activity-line"><div className="activity-mark" style={{ background:"#e8f8f5", color:"#138b7e" }}><Sparkles size={12}/></div><div><b>Insight dihitung dari workflow</b><span>Skor dan metrik diperbarui otomatis dari input tiap aktivitas.</span></div></div>
        </div></div>
      </section>
    </div>

    <div className="section-title"><div><h2>Automation discovery</h2><p>Rekomendasi berdasarkan karakteristik aktivitas aktual.</p></div><Link href="/app/processes/employee-reimbursement/opportunities" className="button small">Buka discovery <ArrowRight size={12}/></Link></div>
    <div className="three-col">
      {opportunities.slice(0,3).map((item) => <article className="card opportunity-card" key={item.id}>
        <div className="opportunity-top"><span className={`pill ${item.priority === "high" ? "green" : item.priority === "medium" ? "amber" : "gray"}`}>{item.priority === "high" ? "High priority" : item.priority === "medium" ? "Medium" : "Low priority"} · {item.category}</span><div className={`score-ring ${item.priority}`}>{item.score}</div></div>
        <h3>{item.activityName}</h3><p>{item.explanation}</p><div className="factor-list">{item.factors.slice(0,3).map((factor) => <span className="factor-chip" key={factor}>{factor}</span>)}</div>
        <div className="opportunity-actions"><Link href={`/app/processes/${item.processId}/opportunities`} className="button small">Lihat insight <ArrowRight size={12}/></Link></div>
      </article>)}
      {!opportunities.length && <div className="card empty-state">Belum ada peluang terdeteksi. Lengkapi detail aktivitas di Process Studio.</div>}
    </div>

    <div className="section-title"><div><h2>Monthly workload</h2><p>Estimasi jam kerja manual dari aktivitas yang tercatat.</p></div><span className="pill gray"><Gauge size={11}/> Per bulan</span></div>
    <section className="card card-body">
      <div style={{ display:"grid", gap:16 }}>
        {monthlyWorkload.map(({ process, metrics }) => {
          const max = Math.max(1, ...monthlyWorkload.map((x) => x.metrics.monthlyHours));
          return <div key={process.id} style={{ display:"grid", gridTemplateColumns:"190px minmax(0,1fr) 72px", alignItems:"center", gap:12 }}>
            <div><Link href={`/app/processes/${process.id}`} className="process-title">{process.name}</Link><div className="process-meta">{process.department}</div></div>
            <div className="progress" style={{ height:7 }}><span style={{ width:`${metrics.monthlyHours / max * 100}%`, background:"linear-gradient(90deg,#766cf4,#a29bf9)" }}/></div>
            <div style={{ textAlign:"right", fontSize:10, fontWeight:700 }}>{number(metrics.monthlyHours, 1)} jam</div>
          </div>;
        })}
      </div>
      <div className="metric-foot" style={{ marginTop:18, borderTop:"1px solid #f0f1f5", paddingTop:11 }}><span>Jam kerja = human effort × volume bulanan. Estimasi, bukan timesheet aktual.</span><span>{money(monthlyWorkload.reduce((sum, x) => sum + x.metrics.monthlyCost, 0))} total biaya / bln</span></div>
    </section>
  </main>;
}
