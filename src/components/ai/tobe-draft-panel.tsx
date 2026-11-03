"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot, CircleAlert, CircleCheck, Sparkles, WandSparkles } from "lucide-react";
import { toAiGraph, toAiProcessContext } from "@/lib/ai/client";
import type { AiToBeResponse } from "@/lib/ai/contracts";
import type { BusinessProcess, FlowNode, WorkflowGraph } from "@/lib/types";
import { minutes, modeLabels } from "@/lib/format";
import { useFlowprintStore } from "@/stores/flowprint-store";

type Status = { configured: boolean; provider: string; model: string };

type DraftPayload = Omit<AiToBeResponse, "graph"> & { graph: WorkflowGraph; sourceFingerprint: string };

export function AiToBeDraftPanel({ process, getCurrentGraph, onApply }: { process: BusinessProcess; getCurrentGraph: () => WorkflowGraph; onApply: (graph: WorkflowGraph) => void }) {
  const syncStatus = useFlowprintStore((state) => state.syncStatus);
  const [status, setStatus] = useState<Status | null>(null);
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [staleDraft, setStaleDraft] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/ai/status").then((response) => response.json()).then((value: Status) => { if (active) setStatus(value); }).catch(() => { if (active) setStatus({ configured: false, provider: "Google AI Studio", model: "" }); });
    return () => { active = false; };
  }, []);
  const signedOut = syncStatus === "demo";
  const createDraft = async () => {
    setBusy(true); setError(""); setDraft(null); setStaleDraft(false);
    try {
      const sourceGraph = toAiGraph(getCurrentGraph());
      const sourceFingerprint = JSON.stringify(sourceGraph);
      const response = await fetch("/api/ai/tobe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ process: toAiProcessContext(process), currentGraph: sourceGraph, instruction }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Draft To-Be gagal dibuat.");
      setDraft({ ...(payload.draft as Omit<DraftPayload,"sourceFingerprint">), sourceFingerprint });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Draft To-Be gagal dibuat.");
    } finally { setBusy(false); }
  };
  const ordered = draft ? [...draft.graph.nodes].sort((a,b)=>a.position.y-b.position.y) : [];
  const applyDraft=()=>{
    if(!draft)return;
    if(draft.sourceFingerprint!==JSON.stringify(toAiGraph(getCurrentGraph()))){setStaleDraft(true);setError("");return;}
    onApply(draft.graph);setDraft(null);setStaleDraft(false);
  };

  return <section className="ai-draft-box">
    <div className="ai-draft-head"><div><span className="pill purple"><Sparkles size={10}/> Gemini · optional</span><b>Draft a To-Be workflow</b><small>Draft disiapkan untuk ditinjau; tidak diterapkan sampai Anda menekan Apply.</small></div><button className="button small" onClick={createDraft} disabled={busy || !status?.configured || signedOut}>{busy?<><span className="spinner-small"/> Membuat draft…</>:<><WandSparkles size={12}/> Generate draft</>}</button></div>
    <label className="tiny muted" htmlFor="ai-tobe-instruction">Brief tambahan (opsional)</label><textarea id="ai-tobe-instruction" className="input" rows={2} maxLength={800} value={instruction} onChange={(e)=>setInstruction(e.target.value)} placeholder="Contoh: kurangi input berulang, tetapi pertahankan approval dan kontrol finance." style={{marginTop:5,fontSize:9,lineHeight:1.5,resize:"vertical"}}/>
    <div className="ai-privacy-note"><CircleAlert size={12}/><span>Tombol Generate mengirim konteks proses, graph baseline, dan graph To-Be saat ini ke Google AI Studio. Jangan sertakan data pribadi/rahasia. Durasi lama dipertahankan; nilai 0 pada aktivitas baru perlu diukur. Tidak ada klaim penghematan otomatis.</span></div>
    {signedOut&&<div className="tiny muted" style={{marginTop:8}}>Sign in ke cloud workspace untuk memakai Gemini AI. <Link href="/login">Sign in →</Link></div>}
    {status&&!status.configured&&<div className="tiny muted" style={{marginTop:8}}>Gemini belum aktif di server. Tambahkan <code>GEMINI_API_KEY</code> yang sudah dirotasi sebagai secret server-side.</div>}
    {error&&<div className="ai-error"><CircleAlert size={12}/>{error}</div>}
    {draft&&<div className="ai-draft-preview"><div className="ai-summary"><CircleCheck size={13}/><div><b>Draft valid · {draft.graph.nodes.length} node</b><p>{draft.rationale}</p></div></div><div className="ai-assumptions"><b>Assumptions to validate</b><ul>{draft.assumptions.map((item,index)=><li key={index}>{item}</li>)}</ul></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Urutan draft</th><th>Mode</th><th>Effort</th><th>Wait</th></tr></thead><tbody>{ordered.map((node)=>{const data=node.data as FlowNode["data"];return <tr key={node.id}><td><b>{data.label}</b><div className="tiny muted">{node.type==="wait"?"Waiting node":node.type}</div></td><td>{node.type==="activity"?modeLabels[data.workMode]:"—"}</td><td>{node.type==="activity"?minutes(data.effortMinutes):"—"}</td><td>{node.type==="wait"||data.waitMinutes>0?minutes(data.waitMinutes):"—"}</td></tr>;})}</tbody></table></div>{staleDraft&&<div className="ai-error"><CircleAlert size={12}/>Graph skenario berubah setelah draft dibuat. Buat draft baru agar perubahan terbaru tidak tertimpa.</div>}<div className="ai-draft-actions"><button className="button primary small" disabled={staleDraft} onClick={applyDraft}>Apply draft to this scenario</button><button className="button small" onClick={()=>setDraft(null)}>Discard draft</button></div><p className="tiny muted" style={{margin:"8px 0 0"}}>Apply mengganti graph To-Be skenario ini saja. Baseline As-Is tidak berubah; lanjutkan review dan edit di canvas.</p></div>}
  </section>;
}
