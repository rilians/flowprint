"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot, CircleAlert, CircleCheck, Sparkles } from "lucide-react";
import { toAiProcessContext } from "@/lib/ai/client";
import type { AiDiscoveryResponse } from "@/lib/ai/contracts";
import type { BusinessProcess } from "@/lib/types";
import { useFlowprintStore } from "@/stores/flowprint-store";

type Status = { configured: boolean; provider: string; model: string };

export function AiDiscoveryPanel({ process }: { process: BusinessProcess }) {
  const syncStatus = useFlowprintStore((state) => state.syncStatus);
  const [status, setStatus] = useState<Status | null>(null);
  const [result, setResult] = useState<AiDiscoveryResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/ai/status").then((response) => response.json()).then((value: Status) => { if (active) setStatus(value); }).catch(() => { if (active) setStatus({ configured: false, provider: "Google AI Studio", model: "" }); });
    return () => { active = false; };
  }, []);
  const signedOut = syncStatus === "demo";
  const analyze = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/ai/discovery", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ process: toAiProcessContext(process) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "AI discovery gagal.");
      setResult(payload.result as AiDiscoveryResponse);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "AI discovery gagal.");
    } finally { setBusy(false); }
  };
  const nodeLabel = (id: string) => process.graph.nodes.find((node) => node.id === id)?.data.label || id;

  return <section className="card ai-panel">
    <div className="ai-panel-head"><div><span className="pill purple"><Sparkles size={10}/> Optional Gemini AI</span><h2>AI discovery copilot</h2><p>Tambahan kualitatif untuk melengkapi—bukan menggantikan—heuristic opportunities dan hitungan deterministik.</p></div><button className="button primary small" onClick={analyze} disabled={busy || !status?.configured || signedOut}>{busy?<><span className="spinner-small"/> Menganalisis…</>:<><Bot size={12}/> Analisis proses</>}</button></div>
    <div className="ai-privacy-note"><CircleAlert size={12}/><span>Hanya setelah tombol ditekan, data proses terpilih (nama, deskripsi, departemen, volume, label/notes node, peran, sistem, dan asumsi) dikirim ke Google AI Studio. Hapus informasi pribadi/rahasia terlebih dahulu. AI tidak mengubah score, baseline, atau skenario.</span></div>
    {signedOut&&<div className="tiny muted" style={{marginTop:9}}>Masuk ke cloud workspace untuk memakai Gemini AI. <Link href="/login">Sign in →</Link></div>}
    {status&&!status.configured&&<div className="tiny muted" style={{marginTop:9}}>Gemini belum aktif di server. Tambahkan <code>GEMINI_API_KEY</code> (key baru yang sudah dirotasi) sebagai environment secret server-side.</div>}
    {error&&<div className="ai-error"><CircleAlert size={12}/>{error}</div>}
    {result&&<div className="ai-result"><div className="ai-summary"><CircleCheck size={13}/><div><b>Ringkasan</b><p>{result.summary}</p></div></div><div className="ai-findings">{result.findings.map((finding,index)=><article className="ai-finding" key={`${finding.title}-${index}`}><div className="ai-finding-top"><b>{finding.title}</b><span className={`pill ${finding.priority==="high"?"amber":finding.priority==="medium"?"purple":"gray"}`}>{finding.priority} · AI label</span></div><p>{finding.observation}</p><div className="ai-suggestion"><b>Saran untuk ditinjau</b><span>{finding.suggestion}</span></div>{finding.relatedNodeIds.length>0&&<div className="ai-node-links"><b>Node terkait:</b> {finding.relatedNodeIds.map(nodeLabel).join(" · ")}</div>}<div className="tiny muted" style={{marginTop:6}}>Perlu verifikasi: {finding.caveat}</div></article>)}</div>{result.questions.length>0&&<div className="ai-questions"><b>Pertanyaan untuk process owner</b><ul>{result.questions.map((question,index)=><li key={index}>{question}</li>)}</ul></div>}<p className="tiny muted" style={{margin:"10px 0 0"}}>Output AI bersifat saran, dapat keliru, dan bukan pengukuran atau komitmen hasil.</p></div>}
  </section>;
}
