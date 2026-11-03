"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addEdge, Background, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow, type Connection, type EdgeChange, type NodeChange, type ReactFlowInstance } from "@xyflow/react";
import { Activity, ArrowDownToLine, Clock3, Copy, CornerDownLeft, Download, Layers3, MousePointer2, Plus, Redo2, Save, Trash2, Undo2, Zap } from "lucide-react";
import { toast } from "sonner";
import { ProcessHeader, useCurrentProcess } from "@/components/process-header";
import { nodeTypes } from "@/components/studio/workflow-nodes";
import { useFlowprintStore } from "@/stores/flowprint-store";
import type { FlowNode, NodeKind, WorkflowGraph } from "@/lib/types";
import { validateWorkflow } from "@/lib/validation";
import { minutes, modeLabels } from "@/lib/format";

const palette: { type:NodeKind; label:string; detail:string; color:string; icon:typeof Activity }[] = [
  { type:"start", label:"Start", detail:"Awal proses", color:"#16a394", icon:CornerDownLeft },
  { type:"activity", label:"Activity", detail:"Pekerjaan operasional", color:"#665cf0", icon:Activity },
  { type:"wait", label:"Waiting", detail:"Waktu tunggu / approval", color:"#d59635", icon:Clock3 },
  { type:"end", label:"End", detail:"Selesai", color:"#4d8f77", icon:Layers3 },
];
const baseData = { label:"Aktivitas baru", description:"", ownerRole:"", workMode:"manual" as const, effortMinutes:15, waitMinutes:0, systemName:"", repeatability:3, standardization:3, errorImpact:3, integrationReadiness:3 };

function makeNode(type:NodeKind, position:{x:number;y:number}):FlowNode {
  const id = `${type}-${Math.random().toString(36).slice(2,7)}-${Date.now().toString(36)}`;
  const defaults = type === "start" ? { ...baseData, label:"Mulai proses" } : type === "end" ? { ...baseData, label:"Selesai" } : type === "wait" ? { ...baseData, label:"Waktu tunggu", waitMinutes:60 } : { ...baseData };
  return { id, type, position, data:defaults };
}

function InspectorField({ label, children }: { label:string; children:React.ReactNode }) {
  return <div className="inspector-field"><label>{label}</label>{children}</div>;
}

function StudioCanvas({ processId, initialGraph, hydrated }: { processId:string; initialGraph:WorkflowGraph; hydrated:boolean }) {
  const updateGraph = useFlowprintStore((s) => s.updateProcessGraph);
  const updateProcess = useFlowprintStore((s) => s.updateProcess);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved"|"saving"|"error">("saved");
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const flow = useReactFlow<FlowNode>();
  const historyRef = useRef<WorkflowGraph[]>([]);
  const redoRef = useRef<WorkflowGraph[]>([]);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const loadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validation = useMemo(() => validateWorkflow({ nodes, edges, schemaVersion:1 }), [nodes, edges]);
  const selectedNode = nodes.find((node) => node.id === selectedId) || null;

  useEffect(() => { nodesRef.current = nodes; edgesRef.current = edges; }, [nodes, edges]);
  const takeSnapshot = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-29), { nodes:structuredClone(nodesRef.current), edges:structuredClone(edgesRef.current), schemaVersion:1 }];
    redoRef.current = [];
    setUndoCount(historyRef.current.length); setRedoCount(0);
  }, []);

  useEffect(() => {
    loadedRef.current = false;
    setNodes(initialGraph.nodes);
    setEdges(initialGraph.edges);
    setSelectedId(null);
    const timer = setTimeout(() => { loadedRef.current = true; }, 0);
    return () => clearTimeout(timer);
  }, [processId, initialGraph.nodes, initialGraph.edges, setNodes, setEdges]);

  useEffect(() => {
    if (!hydrated || !loadedRef.current) return;
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        updateGraph(processId, { nodes, edges, schemaVersion:1 });
        updateProcess(processId, { analysisStatus: validation.valid ? "analyzed" : "draft" });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 650);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nodes, edges, processId, updateGraph, updateProcess, hydrated, validation.valid]);

  const undo = useCallback(() => {
    const previous = historyRef.current.at(-1);
    if (!previous) return;
    redoRef.current = [...redoRef.current, { nodes:structuredClone(nodesRef.current), edges:structuredClone(edgesRef.current), schemaVersion:1 }];
    historyRef.current = historyRef.current.slice(0, -1);
    setNodes(previous.nodes); setEdges(previous.edges);
    setUndoCount(historyRef.current.length); setRedoCount(redoRef.current.length);
  }, [setEdges,setNodes]);
  const redo = useCallback(() => {
    const next = redoRef.current.at(-1);
    if (!next) return;
    historyRef.current = [...historyRef.current, { nodes:structuredClone(nodesRef.current), edges:structuredClone(edgesRef.current), schemaVersion:1 }];
    redoRef.current = redoRef.current.slice(0, -1);
    setNodes(next.nodes); setEdges(next.edges);
    setUndoCount(historyRef.current.length); setRedoCount(redoRef.current.length);
  }, [setEdges,setNodes]);

  useEffect(() => {
    const keyHandler = (event:KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT","TEXTAREA","SELECT"].includes(target.tagName)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [redo, undo]);

  const addNode = useCallback((type:NodeKind, position?:{x:number;y:number}) => {
    takeSnapshot();
    const pos = position || { x:240 + Math.random()*100, y:100 + nodesRef.current.length*34 };
    const newNode = makeNode(type,pos);
    setNodes((current) => [...current,newNode]); setSelectedId(newNode.id);
  }, [setNodes,takeSnapshot]);
  const onConnect = useCallback((connection:Connection) => {
    takeSnapshot();
    setEdges((current) => addEdge({ ...connection, type:"smoothstep", animated:false, markerEnd:{type:MarkerType.ArrowClosed} }, current));
  }, [setEdges,takeSnapshot]);
  const onNodesChangeSafe = useCallback((changes:NodeChange<FlowNode>[]) => {
    if (changes.some((change) => change.type === "remove")) takeSnapshot();
    onNodesChange(changes);
    const removed = changes.filter((change) => change.type === "remove").map((change) => change.id);
    if (removed.length) setEdges((current) => current.filter((edge) => !removed.includes(edge.source) && !removed.includes(edge.target)));
  }, [onNodesChange,setEdges,takeSnapshot]);
  const onEdgesChangeSafe = useCallback((changes:EdgeChange[]) => {
    if (changes.some((change) => change.type === "remove")) takeSnapshot();
    onEdgesChange(changes);
  }, [onEdgesChange,takeSnapshot]);
  const removeSelected = () => {
    if (!selectedNode) return;
    takeSnapshot();
    setNodes((current) => current.filter((node) => node.id !== selectedNode.id));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedId(null);
  };
  const duplicateSelected = () => {
    if (!selectedNode) return;
    takeSnapshot();
    const copy = { ...structuredClone(selectedNode), id:`${selectedNode.type}-${Math.random().toString(36).slice(2,7)}`, position:{ x:selectedNode.position.x+35, y:selectedNode.position.y+38 }, selected:false } as FlowNode;
    setNodes((current) => [...current,copy]); setSelectedId(copy.id);
  };
  const changeSelected = (key:string, value:unknown) => {
    if (!selectedNode) return;
    takeSnapshot();
    setNodes((current) => current.map((node) => node.id === selectedNode.id ? { ...node, data:{ ...node.data, [key]:value } } : node));
  };
  const onDrop = useCallback((event:React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/flowprint-node") as NodeKind;
    if (!type || !["start","activity","wait","end"].includes(type)) return;
    addNode(type, flow.screenToFlowPosition({ x:event.clientX,y:event.clientY }));
  }, [addNode,flow]);
  const exportGraph = () => {
    const blob = new Blob([JSON.stringify({ processId, graph:{ nodes,edges,schemaVersion:1 } },null,2)],{type:"application/json"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${processId}-workflow.json`; a.click(); URL.revokeObjectURL(a.href);
    toast.success("Workflow JSON diunduh.");
  };
  const onNodeDragStart = () => takeSnapshot();

  return <div className="studio-layout">
    <aside className="studio-panel left">
      <h3>Node library</h3><p className="panel-caption">Drag ke canvas atau klik untuk menambahkan.</p>
      <div className="palette-items">{palette.map(({ type,label,detail,color,icon:Icon }) => <div key={type} className="palette-item" draggable onDragStart={(event) => { event.dataTransfer.setData("application/flowprint-node",type); event.dataTransfer.effectAllowed="move"; }} onClick={() => addNode(type)}>
        <span className="palette-icon" style={{ background:`${color}15`,color }}><Icon size={13}/></span><span className="palette-copy"><b>{label}</b><span>{detail}</span></span>
      </div>)}</div>
      <hr className="inspector-divider"/>
      <button className="button small" style={{ width:"100%" }} onClick={() => addNode("activity")}><Plus size={12}/> Tambah aktivitas</button>
      <div className={`validation-box ${validation.valid ? "valid" : "invalid"}`}>
        <b>{validation.valid ? "Workflow valid" : "Perlu diperbaiki"}</b><div style={{ marginTop:4 }}>{validation.valid ? "Satu jalur Mulai → Selesai terhubung." : validation.issues.slice(0,3).join(" ")}</div>
        {!validation.valid && validation.issues.length>3 && <div style={{ marginTop:3 }}>+ {validation.issues.length-3} masalah lainnya</div>}
      </div>
      <p style={{ fontSize:8,color:"#9298a7",lineHeight:1.6,marginTop:9 }}>Alur MVP mendukung proses linear tanpa branching. Perubahan tersimpan otomatis di browser.</p>
    </aside>
    <section className="canvas-wrap" onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect="move"; }}>
      <div className="canvas-toolbar"><div className="canvas-controls">
        <button className="icon-button" title="Undo (Ctrl/Cmd+Z)" onClick={undo} disabled={!undoCount}><Undo2 size={14}/></button><button className="icon-button" title="Redo (Ctrl/Cmd+Y)" onClick={redo} disabled={!redoCount}><Redo2 size={14}/></button><button className="icon-button" title="Fit view" onClick={() => flow.fitView({ padding:.25,duration:300 })}><MousePointer2 size={13}/></button><button className="icon-button" title="Download JSON" onClick={exportGraph}><Download size={13}/></button>
      </div><span className={`save-status ${saveState}`}><i/>{saveState === "saving" ? "Menyimpan…" : saveState === "error" ? "Gagal menyimpan" : "Tersimpan lokal"}</span></div>
      <ReactFlow<FlowNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChangeSafe}
        onEdgesChange={onEdgesChangeSafe}
        onConnect={onConnect}
        onNodeClick={(_,node) => setSelectedId(node.id)}
        onPaneClick={() => setSelectedId(null)}
        onNodeDragStart={onNodeDragStart}
        onInit={(instance:ReactFlowInstance<FlowNode>) => instance.fitView({ padding:.25 })}
        fitView
        fitViewOptions={{ padding:.25 }}
        snapToGrid
        snapGrid={[18,18]}
        deleteKeyCode={["Backspace","Delete"]}
        selectionOnDrag
        panOnDrag={[1,2]}
        minZoom={.25}
        maxZoom={1.6}
        attributionPosition="bottom-center"
      >
        <Background color="#e0e2eb" gap={18} size={1}/>
        <Controls position="bottom-left" showInteractive={false}/>
        <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => node.type === "start" ? "#16a394" : node.type === "end" ? "#4d8f77" : node.type === "wait" ? "#d59635" : "#665cf0"} maskColor="rgba(245,245,252,.65)"/>
      </ReactFlow>
    </section>
    <aside className="studio-panel right">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}><h3>Node inspector</h3>{selectedNode && <div style={{ display:"flex", gap:2 }}><button className="icon-button" title="Duplicate node" onClick={duplicateSelected}><Copy size={12}/></button><button className="icon-button" title="Delete node" onClick={removeSelected}><Trash2 size={12}/></button></div>}</div>
      <p className="panel-caption">{selectedNode ? `Properties · ${selectedNode.type}` : "Pilih node pada canvas untuk melihat propertinya."}</p>
      {!selectedNode ? <div className="empty-state" style={{ padding:"30px 5px", fontSize:9 }}><MousePointer2 size={18} style={{ margin:"0 auto 9px", color:"#aaa6eb" }}/><span>Pilih aktivitas, waiting, start, atau end.</span></div> : <>
        <InspectorField label={selectedNode.type === "activity" ? "Nama aktivitas" : selectedNode.type === "wait" ? "Nama waiting" : "Label node"}><input value={selectedNode.data.label} onChange={(e) => changeSelected("label",e.target.value)} /></InspectorField>
        {(selectedNode.type === "activity" || selectedNode.type === "wait") && <>
          <InspectorField label="Deskripsi"><textarea value={selectedNode.data.description} onChange={(e) => changeSelected("description",e.target.value)} placeholder="Tambahkan konteks proses…"/></InspectorField>
          <div className="inspector-grid"><InspectorField label={selectedNode.type === "wait" ? "Departemen" : "Pemilik peran"}><input value={selectedNode.data.ownerRole} onChange={(e) => changeSelected("ownerRole",e.target.value)} placeholder="Operations"/></InspectorField><InspectorField label={selectedNode.type === "wait" ? "Durasi tunggu (mnt)" : "Effort (mnt)"}><input type="number" min="0" value={selectedNode.type === "wait" ? selectedNode.data.waitMinutes : selectedNode.data.effortMinutes} onChange={(e) => changeSelected(selectedNode.type === "wait" ? "waitMinutes" : "effortMinutes", Math.max(0,Number(e.target.value)))} /></InspectorField></div>
          {selectedNode.type === "activity" && <>
            <div className="inspector-grid"><InspectorField label="Mode kerja"><select value={selectedNode.data.workMode} onChange={(e) => changeSelected("workMode",e.target.value)}><option value="manual">Manual</option><option value="semi_automated">Semi-otomatis</option><option value="automated">Otomatis</option></select></InspectorField><InspectorField label="Wait activity (mnt)"><input type="number" min="0" value={selectedNode.data.waitMinutes} onChange={(e) => changeSelected("waitMinutes",Math.max(0,Number(e.target.value)))}/></InspectorField></div>
            <InspectorField label="Sistem / tool"><input value={selectedNode.data.systemName} onChange={(e) => changeSelected("systemName",e.target.value)} placeholder="Contoh: Excel"/></InspectorField>
            <hr className="inspector-divider"/><div className="tiny muted" style={{ marginBottom:9 }}>Scoring factors · skala 1–5</div>
            <div className="inspector-grid"><InspectorField label="Repetisi"><select value={selectedNode.data.repeatability} onChange={(e) => changeSelected("repeatability",Number(e.target.value))}>{[1,2,3,4,5].map((v)=><option key={v} value={v}>{v} / 5</option>)}</select></InspectorField><InspectorField label="Standardisasi"><select value={selectedNode.data.standardization} onChange={(e) => changeSelected("standardization",Number(e.target.value))}>{[1,2,3,4,5].map((v)=><option key={v} value={v}>{v} / 5</option>)}</select></InspectorField><InspectorField label="Dampak error"><select value={selectedNode.data.errorImpact} onChange={(e) => changeSelected("errorImpact",Number(e.target.value))}>{[1,2,3,4,5].map((v)=><option key={v} value={v}>{v} / 5</option>)}</select></InspectorField><InspectorField label="Kesiapan integrasi"><select value={selectedNode.data.integrationReadiness} onChange={(e) => changeSelected("integrationReadiness",Number(e.target.value))}>{[1,2,3,4,5].map((v)=><option key={v} value={v}>{v} / 5</option>)}</select></InspectorField></div>
          </>}
        </>}
        {(selectedNode.type === "start" || selectedNode.type === "end") && <p className="tiny muted" style={{ lineHeight:1.6 }}>Node kontrol alur. Edit label di atas, lalu sambungkan dengan handle pada node.</p>}
        <hr className="inspector-divider"/><div className="tiny muted">Posisi canvas</div><div className="tiny" style={{ marginTop:4 }}>X {Math.round(selectedNode.position.x)} · Y {Math.round(selectedNode.position.y)}</div>
        <div style={{ marginTop:14, display:"flex", gap:6 }}><button className="button small" onClick={() => { takeSnapshot(); flow.fitView({ padding:.24,duration:250 }); }}><ArrowDownToLine size={11}/> Fit view</button><button className="button small" onClick={() => { updateGraph(processId,{nodes,edges,schemaVersion:1}); updateProcess(processId,{analysisStatus:validation.valid?"analyzed":"draft"}); setSaveState("saved"); toast.success("Workflow tersimpan di browser."); }}><Save size={11}/> Simpan</button></div>
      </>}
    </aside>
  </div>;
}

function StudioInner() {
  const process = useCurrentProcess();
  const hydrated = useFlowprintStore((s) => s.hydrated);
  const syncStatus = useFlowprintStore((s) => s.syncStatus);
  const persistenceLabel = syncStatus === "synced" ? "Supabase cloud" : syncStatus === "connecting" ? "Menyiapkan cloud sync" : syncStatus === "error" ? "Sync error · cek Settings" : "Demo Mode";
  if (!process) return <main className="page-content"><div className="card empty-state">Proses tidak ditemukan. <a href="/app/processes">Kembali ke library.</a></div></main>;
  return <main className="page-content" style={{ paddingBottom:20 }}>
    <ProcessHeader process={process} subtitle="Bangun dan validasi baseline proses. Perubahan disimpan otomatis ke workspace aktif."/>
    {!hydrated && <div className="pill gray" style={{ marginBottom:10 }}>Memuat data tersimpan…</div>}
    <StudioCanvas key={`${process.id}-${hydrated ? "ready" : "loading"}`} processId={process.id} initialGraph={process.graph} hydrated={hydrated}/>
    <div className="metric-foot" style={{ marginTop:10 }}><span>Drag node untuk memindahkan · Connect handle untuk membuat edge · Ctrl/Cmd+Z untuk undo</span><span>Graph schema v1 · {persistenceLabel}</span></div>
  </main>;
}

export function StudioView() {
  return <ReactFlowProvider><StudioInner/></ReactFlowProvider>;
}
