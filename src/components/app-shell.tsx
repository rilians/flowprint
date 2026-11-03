"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Activity, Bell, ChevronRight, CircleHelp, FileBarChart2, Home, Search, Settings2, Workflow, X } from "lucide-react";
import { toast } from "sonner";
import { StoreHydrator } from "@/components/store-hydrator";
import { useFlowprintStore } from "@/stores/flowprint-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const nav = [
  { href: "/app", label: "Dashboard", icon: Home, match: (p: string) => p === "/app" },
  { href: "/app/processes", label: "Process Library", icon: Workflow, match: (p: string) => p.startsWith("/app/processes") },
  { href: "/app/reports", label: "Reports", icon: FileBarChart2, match: (p: string) => p.startsWith("/app/reports") },
  { href: "/app/settings", label: "Settings", icon: Settings2, match: (p: string) => p.startsWith("/app/settings") },
];
const labels: Record<string, string> = {
  app: "Workspace", processes: "Process Library", studio: "Process Studio", intelligence: "Intelligence", opportunities: "Opportunities", scenarios: "Simulator", reports: "Reports", settings: "Settings", new: "New Process",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const processes = useFlowprintStore((state) => state.processes);
  const syncStatus = useFlowprintStore((state) => state.syncStatus);
  const authEmail = useFlowprintStore((state) => state.authEmail);
  const syncError = useFlowprintStore((state) => state.syncError);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => processes.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.department.toLowerCase().includes(query.toLowerCase())).slice(0, 5), [processes, query]);
  const crumbs = pathname.split("/").filter(Boolean);
  const last = crumbs.at(-1) || "app";
  const title = labels[last] || last.replaceAll("-", " ");
  const handleAccount = async () => {
    if (!authEmail) { router.push("/login"); return; }
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) toast.error(error.message);
    else toast.success("Anda sudah keluar. Workspace kembali ke Demo Mode.");
  };

  return <>
    <StoreHydrator />
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/app" className="brand" aria-label="FLOWPRINT dashboard">
          <span className="brand-mark">F</span><span>FLOWPRINT<span className="brand-sub">PROCESS INTELLIGENCE</span></span>
        </Link>
        <div className="nav-label">Workspace</div>
        <nav className="nav-list" aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon, match }) => <Link key={href} href={href} className={`nav-item ${match(pathname) ? "active" : ""}`}>
            <Icon size={16} /><span className="nav-text">{label}</span>
          </Link>)}
        </nav>
        <div className="nav-label" style={{ marginTop: 20 }}>Explore</div>
        <nav className="nav-list">
          <Link href="/app/processes/employee-reimbursement" className={`nav-item ${pathname.endsWith("employee-reimbursement") ? "active" : ""}`}><Activity size={16}/><span className="nav-text">Live demo process</span></Link>
        </nav>
        <div className="sidebar-spacer" />
        <div className="workspace-pill">
          <div className="workspace-logo">N</div><div className="workspace-copy"><b>Northstar workspace</b><span>Demo environment</span></div>
          <ChevronRight size={13} color="#9aa0ad" />
        </div>
        <Link href={authEmail?"/app/settings":"/login"} className="demo-indicator" title={syncError||undefined}><i className="demo-dot" style={{background:syncStatus==="synced"?"#16a394":syncStatus==="error"?"#dc6262":syncStatus==="connecting"?"#e9a23b":undefined}}/><span>{syncStatus==="synced"?`Cloud sync · ${authEmail}`:syncStatus==="connecting"?"Menghubungkan ke Supabase…":syncStatus==="error"?"Cloud sync bermasalah · lihat Settings":"Demo Mode · disimpan lokal · masuk"}</span></Link>
        <div className="sidebar-bottom">{syncStatus==="synced"?"Workspace tersinkron dengan Supabase.":"Data contoh bersifat ilustratif."}<br/>{syncStatus==="synced"?"RLS melindungi data akun.":"Demo tidak tersinkron ke cloud."}</div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumbs"><Link href="/app" style={{ color: "inherit" }}>Workspace</Link><ChevronRight size={12}/><b>{title}</b></div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Cari proses"><Search size={16}/></button>
            <button className="icon-button" onClick={() => toast.info("Belum ada notifikasi baru di workspace demo.")} aria-label="Notifikasi"><Bell size={16}/></button>
            <button className="icon-button" onClick={() => router.push("/app/settings")} aria-label="Bantuan dan pengaturan"><CircleHelp size={16}/></button>
            <button className="avatar" title={authEmail?`Keluar dari ${authEmail}`:"Masuk / buat akun"} onClick={handleAccount} style={{border:0}}>{authEmail?authEmail.slice(0,2).toUpperCase():"DA"}</button>
          </div>
        </header>
        {children}
      </div>
    </div>
    {searchOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Cari proses">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}><h2>Cari proses</h2><button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Tutup"><X size={16}/></button></div>
        <div style={{ position:"relative" }}><Search size={15} style={{ position:"absolute", left:11, top:10, color:"#969bad" }}/><input autoFocus className="input" style={{ paddingLeft:34 }} placeholder="Nama proses atau departemen…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div style={{ marginTop:14 }}>
          {results.length ? results.map((process) => <button key={process.id} onClick={() => { setSearchOpen(false); router.push(`/app/processes/${process.id}`); }} style={{ border:0, background:"transparent", width:"100%", textAlign:"left", padding:"10px 4px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #f1f2f5" }}><span><b style={{ display:"block", fontSize:11 }}>{process.name}</b><span className="tiny muted">{process.department}</span></span><ChevronRight size={14} color="#999"/></button>) : <div className="empty-state" style={{ padding:20 }}>Tidak ada proses yang cocok.</div>}
        </div>
      </div>
    </div>}
  </>;
}
