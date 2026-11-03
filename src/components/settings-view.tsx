"use client";
import Link from "next/link";
import { useState } from "react";
import { Download, HardDrive, Info, LogOut, RotateCcw, ShieldCheck, Sparkles, UserRound, Cloud, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useFlowprintStore } from "@/stores/flowprint-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SettingsView() {
  const processes=useFlowprintStore((s)=>s.processes);
  const scenarios=useFlowprintStore((s)=>s.scenarios);
  const resetDemo=useFlowprintStore((s)=>s.resetDemo);
  const syncStatus=useFlowprintStore((s)=>s.syncStatus);
  const authEmail=useFlowprintStore((s)=>s.authEmail);
  const syncError=useFlowprintStore((s)=>s.syncError);
  const [confirm,setConfirm]=useState(false);
  const isCloud=syncStatus==="synced";
  const downloadData=()=>{
    const payload={exportedAt:new Date().toISOString(),mode:isCloud?"supabase-cloud":"local-demo",processes,scenarios};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="flowprint-workspace.json";link.click();URL.revokeObjectURL(url);toast.success("Snapshot workspace diunduh.");
  };
  const signOut=async()=>{
    const client=getSupabaseBrowserClient();if(!client)return;
    const {error}=await client.auth.signOut();if(error)toast.error(error.message);else toast.success("Keluar dari Supabase. Demo lokal aktif kembali.");
  };
  const statusLabel=syncStatus==="synced"?"Cloud sync aktif":syncStatus==="connecting"?"Menghubungkan…":syncStatus==="error"?"Cloud sync error":"Demo Mode · local";
  return <main className="page-content" style={{maxWidth:1050}}>
    <div className="page-heading"><div><div className="eyebrow">Workspace preferences</div><h1>Settings</h1><p>Kelola akun, sinkronisasi, dan salinan data FLOWPRINT.</p></div></div>
    <div className="two-col" style={{alignItems:"start"}}>
      <div style={{display:"grid",gap:13}}>
        <section className="card card-body"><div style={{display:"flex",gap:10,alignItems:"center"}}><div className={`stat-icon ${isCloud?"teal":"amber"}`} style={{margin:0}}>{isCloud?<Cloud size={15}/>:<HardDrive size={15}/>}</div><div><h2 style={{fontSize:13,margin:0}}>{statusLabel}</h2><span className="tiny muted">{authEmail||"Perubahan lokal tersimpan di browser ini"}</span></div><span className={`pill ${isCloud?"green":syncStatus==="error"?"red":"amber"}`} style={{marginLeft:"auto"}}>{isCloud?"Synced":syncStatus=== "connecting"?"Connecting":syncStatus==="error"?"Action needed":"Local only"}</span></div>
          {syncError&&<div className="warning-banner" style={{marginTop:13}}><b>Sinkronisasi gagal.</b> {syncError} Perubahan lokal tetap tersedia di browser.</div>}
          <p className="tiny muted" style={{lineHeight:1.7,margin:"13px 0"}}>{isCloud?"Proses dan skenario tersimpan di Supabase. Perubahan disinkron otomatis setelah jeda singkat; RLS membatasi akses ke workspace milik akun Anda.":"Demo Mode tetap bisa digunakan tanpa login. Masuk dengan akun Supabase untuk menyimpan data ke cloud dan mengaksesnya lintas sesi."}</p>
          <div className="two-col" style={{gap:8}}><div className="compare-value"><span>Process records</span><b>{processes.length}</b></div><div className="compare-value"><span>Saved scenarios</span><b>{scenarios.length}</b></div></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>{authEmail?<button className="button small" onClick={signOut}><LogOut size={12}/> Sign out</button>:<Link href="/login" className="button primary small"><UserRound size={12}/> Sign in / Create account</Link>}<button className="button small" onClick={downloadData}><Download size={12}/> Export workspace snapshot</button></div>
        </section>
        <section className="card card-body"><div style={{display:"flex",gap:9,alignItems:"center"}}><div className="stat-icon teal" style={{margin:0}}><ShieldCheck size={15}/></div><div><h2 style={{fontSize:13,margin:0}}>Data & privacy</h2><span className="tiny muted">RLS protects cloud records; sample data is illustrative</span></div></div><div style={{display:"grid",gap:10,marginTop:14}}>{["Supabase browser access uses only the publishable key; no service-role key is shipped to the client.","Cloud tables are protected by owner-based Row Level Security.","No external workflow automation is executed.","Opportunity scores are transparent heuristics, not AI predictions.","Sample metrics and To-Be scenario are illustrative, not measured company results."].map((text)=><div key={text} className="activity-line"><div className="activity-mark" style={{background:"#eaf8f5",color:"#128a7e"}}><Info size={12}/></div><div className="tiny muted" style={{lineHeight:1.6}}>{text}</div></div>)}</div></section>
      </div>
      <div style={{display:"grid",gap:13}}>
        <section className="card card-body"><div className="stat-icon purple"><Sparkles size={15}/></div><h2 style={{fontSize:13,margin:"0 0 7px"}}>Supabase integration</h2><p className="tiny muted" style={{lineHeight:1.7}}>Connected project: <b>life-in-routes</b> (ap-southeast-1). FLOWPRINT uses isolated <code>flowprint_*</code> tables; existing tables were left untouched.</p><div className="report-note">Migration <code>flowprint_schema</code> is applied with UUID keys, JSONB process graphs, foreign keys, timestamps, and RLS. Sign in to create your private workspace.</div><p className="tiny muted" style={{lineHeight:1.6,margin:"12px 0 0"}}>Setup reference: <code>supabase/migrations/0002_flowprint_supabase.sql</code> · <code>README.md</code></p>
          {syncStatus==="error"&&<div style={{marginTop:12,display:"flex",gap:8,alignItems:"flex-start",fontSize:9,color:"#a5543a"}}><AlertTriangle size={13}/><span>Remote sync belum aktif. Cek koneksi dan login ulang setelah memperbaiki konfigurasi.</span></div>}
        </section>
        {syncStatus==="demo"&&<section className="card card-body"><h2 style={{fontSize:13,margin:"0 0 6px"}}>Demo Mode</h2><p className="tiny muted" style={{lineHeight:1.7}}>Demo tetap tersimpan lokal selama belum masuk. Saat masuk, data cloud akun akan dimuat; jika akun belum punya data, contoh lokal akan disalin ke cloud.</p><button className="button danger small" onClick={()=>setConfirm(true)}><RotateCcw size={12}/> Reset demo data</button></section>}
      </div>
    </div>
    {confirm&&<div className="modal-backdrop"><div className="modal"><h2>Reset data demo?</h2><p>Perubahan lokal Anda akan digantikan dengan tiga contoh proses dan satu skenario ilustratif. Export workspace terlebih dahulu jika ingin menyimpan salinan.</p><div className="modal-actions"><button className="button" onClick={()=>setConfirm(false)}>Batal</button><button className="button danger" onClick={()=>{resetDemo();setConfirm(false);toast.success("Demo workspace berhasil direset.");}}>Reset workspace</button></div></div></div>}
  </main>;
}
