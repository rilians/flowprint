"use client";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { BarChart3, FileText, LayoutDashboard, Lightbulb, Workflow, Scale } from "lucide-react";
import { useFlowprintStore } from "@/stores/flowprint-store";

const tabs = [
  { key:"overview", label:"Overview", icon:LayoutDashboard, suffix:"" },
  { key:"studio", label:"Studio", icon:Workflow, suffix:"/studio" },
  { key:"intelligence", label:"Intelligence", icon:BarChart3, suffix:"/intelligence" },
  { key:"opportunities", label:"Opportunities", icon:Lightbulb, suffix:"/opportunities" },
  { key:"scenarios", label:"Scenarios", icon:Scale, suffix:"/scenarios" },
  { key:"reports", label:"Reports", icon:FileText, suffix:"/reports" },
];

export function useCurrentProcess() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const processes = useFlowprintStore((s) => s.processes);
  return processes.find((p) => p.id === id);
}

export function ProcessHeader({ process, subtitle }: { process: { id: string; name: string; department: string }; subtitle?: string }) {
  const pathname = usePathname();
  const base = `/app/processes/${process.id}`;
  return <>
    <div className="page-heading">
      <div><div className="eyebrow">{process.department} · Process workspace</div><h1>{process.name}</h1><p>{subtitle || "Gambaran dan analisis untuk proses ini."}</p></div>
      <Link href="/app/processes" className="button ghost small">‹ Process library</Link>
    </div>
    <nav className="tabs" aria-label="Process sections">{tabs.map(({ key,label,icon:Icon,suffix }) => {
      const href = `${base}${suffix}`;
      const active = suffix ? pathname === href : pathname === base || pathname === `${base}/`;
      return <Link href={href} key={key} className={`tab ${active ? "active" : ""}`}><Icon size={12} style={{ verticalAlign:"-2px", marginRight:6 }}/>{label}</Link>;
    })}</nav>
  </>;
}
