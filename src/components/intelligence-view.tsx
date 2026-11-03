"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Clock3, DollarSign, Fingerprint, HandCoins, Layers3, RefreshCcw, Workflow } from "lucide-react";
import { ProcessHeader, useCurrentProcess } from "@/components/process-header";
import { calculateProcessMetrics } from "@/lib/calculations";
import { money, minutes, number, modeLabels } from "@/lib/format";
import type { FlowNode } from "@/lib/types";
import { validateWorkflow } from "@/lib/validation";
import { WorkflowGate } from "@/components/workflow-gate";

function detectBottlenecks(nodes:FlowNode[], monthlyVolume:number) {
  const result:{node:FlowNode; title:string; metric:string; explanation:string; action:string}[] = [];
  nodes.forEach((node) => {
    if (node.type === "wait" && node.data.waitMinutes >= 240) result.push({ node, title:"Waktu tunggu signifikan", metric:minutes(node.data.waitMinutes), explanation:`Node ini mencatat ${minutes(node.data.waitMinutes)} waktu tunggu per eksekusi. Waktu tunggu meningkatkan cycle time, meski tidak menambah human effort.`, action:"Tinjau SLA, notifikasi, dan jalur eskalasi bersama pemilik proses." });
    if (node.type !== "activity") return;
    const d=node.data;
    if (d.waitMinutes >= 240) result.push({ node, title:"Approval / handoff menambah waktu siklus", metric:minutes(d.waitMinutes), explanation:`${node.data.label} memiliki ${minutes(d.waitMinutes)} waktu tunggu yang diinput. Validasi apakah durasi ini benar untuk kondisi normal.`, action:"Petakan waktu aktual dan sepakati target SLA yang realistis." });
    if (d.effortMinutes >= 30) result.push({ node, title:"Human effort tinggi per aktivitas", metric:`${minutes(d.effortMinutes)} / eksekusi`, explanation:`Effort yang dicatat mencapai ${minutes(d.effortMinutes)} per eksekusi, di atas ambang tinjauan 30 menit. Durasi panjang sendiri tidak membuktikan langkah ini tidak perlu.`, action:"Amati pekerjaan dan pecah durasi ke langkah yang dapat diverifikasi." });
    if (d.workMode === "manual" && d.repeatability >= 4) result.push({ node, title:"Pekerjaan manual berulang", metric:`Repetisi ${d.repeatability}/5`, explanation:`Aktivitas dilakukan manual dengan repetisi ${d.repeatability}/5 pada volume ${number(monthlyVolume)} eksekusi per bulan. Ini faktor discovery, bukan bukti bahwa automasi pasti layak.`, action:"Konfirmasi variasi kasus dan frekuensi sebelum mengevaluasi automasi." });
    if (d.errorImpact >= 4) result.push({ node, title:"Dampak error perlu perhatian", metric:`Dampak ${d.errorImpact}/5`, explanation:`Dampak error dinilai ${d.errorImpact}/5 oleh pemilik proses. Input ini menunjukkan area yang perlu kontrol atau validasi.`, action:"Periksa kontrol saat ini, tingkat rework, dan kebutuhan audit." });
    if (d.workMode === "manual" && /excel|spreadsheet|email|drive/i.test(d.systemName)) result.push({ node, title:"Transfer data antar tool", metric:d.systemName, explanation:`Aktivitas manual menggunakan ${d.systemName}. Perpindahan data berulang dapat menambah effort atau risiko salah input; verifikasi dengan observasi.`, action:"Petakan handoff data dan cek opsi integrasi yang benar-benar tersedia." });
  });
  return result;
}

const COLORS=["#665cf0","#16a394","#e9a23b"];

export function IntelligenceView() {
  const process=useCurrentProcess();
  const workflow=process?validateWorkflow(process.graph):null;
  const insights=useMemo(()=>process&&workflow?.valid?detectBottlenecks(process.graph.nodes,process.monthlyVolume):[],[process?.graph.nodes,process?.monthlyVolume,workflow?.valid]);
  if(!process) return <main className="page-content"><div className="card empty-state">Proses tidak ditemukan.</div></main>;
  if(workflow&&!workflow.valid) return <main className="page-content"><ProcessHeader process={process} subtitle="Baseline workflow perlu divalidasi sebelum analisis."/><WorkflowGate processId={process.id} issues={workflow.issues}/></main>;
  const metrics=calculateProcessMetrics(process.graph,process.monthlyVolume,process.hourlyLaborCost);
  const activities=process.graph.nodes.filter((n)=>n.type === "activity");
  const modes=[{name:"Manual",value:metrics.manualCount},{name:"Semi-otomatis",value:metrics.semiAutomatedCount},{name:"Otomatis",value:metrics.automatedCount}].filter((x)=>x.value>0);
  const effortData=activities.map((node)=>({ name:node.data.label.length>20?`${node.data.label.slice(0,18)}…`:node.data.label, fullName:node.data.label, effort:node.data.effortMinutes, waiting:node.data.waitMinutes }));
  const roleMap=new Map<string,number>();
  activities.forEach((n)=>roleMap.set(n.data.ownerRole || "Belum ditentukan",(roleMap.get(n.data.ownerRole || "Belum ditentukan")||0)+n.data.effortMinutes));
  const roleData=[...roleMap.entries()].map(([name,value])=>({name,value}));
  return <main className="page-content">
    <ProcessHeader process={process} subtitle="Process intelligence dihitung langsung dari input di workflow baseline."/>
    <div className="card" style={{ padding:"11px 14px", marginBottom:14, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}><span className="pill purple">Rule-based analysis</span><span className="tiny muted">Input contoh bersifat ilustratif · Tidak ada data operasional aktual</span><Link href={`/app/processes/${process.id}/studio`} className="button small" style={{ marginLeft:"auto" }}>Edit input <ArrowRight size={11}/></Link></div>
    <div className="stat-grid">
      <div className="card stat-card"><div className="stat-icon purple"><Workflow size={15}/></div><div className="metric-value">{metrics.activityCount}</div><div className="metric-label">Total aktivitas</div><div className="metric-foot"><span>{number(process.monthlyVolume)} eksekusi / bulan</span></div></div>
      <div className="card stat-card"><div className="stat-icon amber"><Layers3 size={15}/></div><div className="metric-value">{metrics.manualCount}<span style={{fontSize:12,color:"#9095a4"}}> / {metrics.activityCount}</span></div><div className="metric-label">Aktivitas manual</div><div className="metric-foot"><span>{metrics.semiAutomatedCount} semi · {metrics.automatedCount} otomatis</span></div></div>
      <div className="card stat-card"><div className="stat-icon teal"><Clock3 size={15}/></div><div className="metric-value">{minutes(metrics.humanEffortMinutes)}</div><div className="metric-label">Human effort / eksekusi</div><div className="metric-foot"><span>Jumlah effort tiap aktivitas</span></div></div>
      <div className="card stat-card"><div className="stat-icon amber"><RefreshCcw size={15}/></div><div className="metric-value">{minutes(metrics.waitingMinutes)}</div><div className="metric-label">Waktu tunggu / eksekusi</div><div className="metric-foot"><span>Wait nodes + wait aktivitas</span></div></div>
    </div>
    <div className="three-col" style={{ marginTop:13 }}>
      <div className="card stat-card"><div className="metric-label">Estimated cycle time</div><div className="metric-value" style={{marginTop:8}}>{minutes(metrics.cycleMinutes)}</div><div className="metric-foot"><span>Effort + waktu tunggu</span></div></div>
      <div className="card stat-card"><div className="metric-label">Monthly human workload</div><div className="metric-value" style={{marginTop:8}}>{number(metrics.monthlyHours,1)}<span style={{fontSize:12,color:"#9095a4",marginLeft:4}}>jam</span></div><div className="metric-foot"><span>Effort × volume bulanan</span></div></div>
      <div className="card stat-card"><div className="metric-label">Estimated monthly labor cost</div><div className="metric-value" style={{fontSize:20,marginTop:10}}>{money(metrics.monthlyCost)}</div><div className="metric-foot"><span>Workload × hourly labor cost</span></div></div>
    </div>
    <div className="two-col" style={{ marginTop:15 }}>
      <section className="card"><div className="card-head"><div><h2>Aktivitas berdasarkan mode kerja</h2><p>Jumlah node activity menurut execution mode.</p></div></div><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={modes} dataKey="value" nameKey="name" innerRadius={48} outerRadius={75} paddingAngle={3}>{modes.map((entry,index)=><Cell key={entry.name} fill={COLORS[index%COLORS.length]}/>)}</Pie><Tooltip/><Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize:9}}/></PieChart></ResponsiveContainer></div></section>
      <section className="card"><div className="card-head"><div><h2>Human effort vs waiting</h2><p>Menit per satu kali eksekusi; tunggu tidak dihitung sebagai labor.</p></div></div><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{name:"Human effort",minutes:metrics.humanEffortMinutes},{name:"Waiting time",minutes:metrics.waitingMinutes}]} margin={{top:14,right:10,left:-16,bottom:2}}><CartesianGrid stroke="#eff0f5" strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:9,fill:"#7f8595"}}/><YAxis tick={{fontSize:8,fill:"#9aa0ae"}}/><Tooltip formatter={(value)=>[`${value} menit`,`Durasi`]}/><Bar dataKey="minutes" radius={[5,5,0,0]} fill="#665cf0"/></BarChart></ResponsiveContainer></div></section>
      <section className="card"><div className="card-head"><div><h2>Effort per aktivitas</h2><p>Human effort yang dicatat pada node aktivitas.</p></div></div><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={effortData} margin={{top:10,right:10,left:-16,bottom:30}}><CartesianGrid stroke="#eff0f5" strokeDasharray="3 3"/><XAxis dataKey="name" interval={0} angle={-16} textAnchor="end" tick={{fontSize:8,fill:"#7f8595"}}/><YAxis tick={{fontSize:8,fill:"#9aa0ae"}}/><Tooltip labelFormatter={(_,payload)=>payload?.[0]?.payload?.fullName || "Aktivitas"} formatter={(value)=>[`${value} menit`,`Effort`]}/><Bar dataKey="effort" radius={[4,4,0,0]} fill="#16a394"/></BarChart></ResponsiveContainer></div></section>
      <section className="card"><div className="card-head"><div><h2>Workload menurut peran</h2><p>Kontribusi total human effort per eksekusi.</p></div></div><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={roleData} layout="vertical" margin={{top:5,right:14,left:12,bottom:5}}><CartesianGrid stroke="#eff0f5" strokeDasharray="3 3"/><XAxis type="number" tick={{fontSize:8,fill:"#9aa0ae"}}/><YAxis type="category" dataKey="name" width={100} tick={{fontSize:8,fill:"#7f8595"}}/><Tooltip formatter={(value)=>[`${value} menit`,`Effort`]}/><Bar dataKey="value" radius={[0,4,4,0]} fill="#8f86f4"/></BarChart></ResponsiveContainer></div></section>
    </div>
    <div className="section-title"><div><h2>Bottleneck & process signals</h2><p>{insights.length} sinyal ditemukan dari input workflow aktual, bukan data telemetri.</p></div><span className="pill gray"><Fingerprint size={11}/> Transparent rules</span></div>
    {insights.length ? <div className="two-col">{insights.map((insight,index)=><article key={`${insight.node.id}-${insight.title}`} className="insight-card"><div className="insight-symbol"><AlertTriangle size={14}/></div><div style={{ minWidth:0, flex:1 }}><div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}><h3>{insight.title}</h3><span className="pill amber">{insight.metric}</span></div><p><b style={{color:"#51586a"}}>{insight.node.data.label}.</b> {insight.explanation}</p><p style={{marginTop:7}}><b style={{color:"#51586a"}}>Tindakan:</b> {insight.action}</p></div><Link href={`/app/processes/${process.id}/studio`} className="button small" title="Buka workflow">Node {index+1}</Link></article>)}</div> : <div className="card empty-state"><b>Tidak ada sinyal berdasarkan aturan saat ini.</b><p>Pastikan input effort, wait, execution mode, dan faktor aktivitas sudah lengkap.</p></div>}
  </main>;
}
