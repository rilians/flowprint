"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { addEdge, Background, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow, type Connection, type EdgeChange, type NodeChange } from "@xyflow/react";
import { Activity, Check, Clock3, CornerDownLeft, Copy, MousePointer2, Plus, Trash2, Workflow } from "lucide-react";
import { nodeTypes } from "@/components/studio/workflow-nodes";
import { useFlowprintStore } from "@/stores/flowprint-store";
import type { FlowNode, NodeKind, Scenario, WorkflowGraph } from "@/lib/types";
import { validateWorkflow } from "@/lib/validation";
import { minutes, modeLabels } from "@/lib/format";
import { toast } from "sonner";

const palette:{type:NodeKind;label:string;icon:typeof Activity;color:string}[]=[
  {type:"activity",label:"Activity",icon:Activity,color:"#665cf0"},
  {type:"wait",label:"Waiting",icon:Clock3,color:"#d59635"},
  {type:"start",label:"Start",icon:CornerDownLeft,color:"#16a394"},
  {type:"end",label:"End",icon:Check,color:"#4d8f77"},
];
const defaults={label:"Aktivitas target baru",description:"",ownerRole:"",workMode:"manual" as const,effortMinutes:10,waitMinutes:0,systemName:"",repeatability:3,standardization:3,errorImpact:3,integrationReadiness:3};
function createNode(type:NodeKind,position:{x:number;y:number}):FlowNode{
  const id=`to-be-${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36)}`;
  const data={...defaults,label:type==="start"?"Mulai":type==="end"?"Selesai":type==="wait"?"Waktu tunggu":defaults.label};
  return {id,type,position,data};
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="inspector-field"><label>{label}</label>{children}</div>;}

type CanvasGraphSnapshot={scenarioId:string;graph:WorkflowGraph};
function Editor({scenario,graphRef}:{scenario:Scenario;graphRef:MutableRefObject<CanvasGraphSnapshot|null>}){
  const updateScenario=useFlowprintStore((s)=>s.updateScenario);
  const [nodes,setNodes,onNodesChange]=useNodesState<FlowNode>(scenario.graph.nodes);
  const [edges,setEdges,onEdgesChange]=useEdgesState(scenario.graph.edges);
  graphRef.current={scenarioId:scenario.id,graph:{nodes,edges,schemaVersion:scenario.graph.schemaVersion||1}};
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [saveState,setSaveState]=useState<"saving"|"saved"|"error">("saved");
  const loaded=useRef(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const flow=useReactFlow<FlowNode>();
  const validation=useMemo(()=>validateWorkflow({nodes,edges,schemaVersion:scenario.graph.schemaVersion||1}),[nodes,edges,scenario.graph.schemaVersion]);
  const selected=nodes.find((node)=>node.id===selectedId)||null;
  useEffect(()=>{const t=setTimeout(()=>{loaded.current=true;},0);return()=>clearTimeout(t);},[]);
  useEffect(()=>{
    if(!loaded.current)return;
    setSaveState("saving");
    if(timer.current)clearTimeout(timer.current);
    timer.current=setTimeout(()=>{
      try{updateScenario(scenario.id,{graph:{nodes,edges,schemaVersion:scenario.graph.schemaVersion||1}});setSaveState("saved");}
      catch{setSaveState("error");}
    },650);
    return()=>{if(timer.current)clearTimeout(timer.current);};
  },[nodes,edges,scenario.id,scenario.graph.schemaVersion,updateScenario]);
  useEffect(()=>()=>{
    if(timer.current)clearTimeout(timer.current);
    const latest=graphRef.current;
    if(latest?.scenarioId===scenario.id) updateScenario(scenario.id,{graph:structuredClone(latest.graph)});
  },[graphRef,scenario.id,updateScenario]);
  const addNode=useCallback((type:NodeKind,position?:{x:number;y:number})=>{
    const node=createNode(type,position||{x:230,y:90+nodes.length*105});
    setNodes((current)=>[...current,node]);setSelectedId(node.id);
  },[nodes.length,setNodes]);
  const connect=useCallback((connection:Connection)=>setEdges((current)=>addEdge({...connection,type:"smoothstep",markerEnd:{type:MarkerType.ArrowClosed}},current)),[setEdges]);
  const onNodesChangeSafe=useCallback((changes:NodeChange<FlowNode>[])=>{
    onNodesChange(changes);
    const removed=changes.filter((change)=>change.type==="remove").map((change)=>change.id);
    if(removed.length){setEdges((current)=>current.filter((edge)=>!removed.includes(edge.source)&&!removed.includes(edge.target)));if(selectedId&&removed.includes(selectedId))setSelectedId(null);}
  },[onNodesChange,setEdges,selectedId]);
  const onEdgesChangeSafe=useCallback((changes:EdgeChange[])=>onEdgesChange(changes),[onEdgesChange]);
  const removeSelected=()=>{
    if(!selected)return;
    setNodes((current)=>current.filter((node)=>node.id!==selected.id));
    setEdges((current)=>current.filter((edge)=>edge.source!==selected.id&&edge.target!==selected.id));
    setSelectedId(null);
  };
  const duplicateSelected=()=>{
    if(!selected)return;
    const duplicate={...structuredClone(selected),id:`to-be-${Math.random().toString(36).slice(2,8)}`,position:{x:selected.position.x+32,y:selected.position.y+32},selected:false} as FlowNode;
    setNodes((current)=>[...current,duplicate]);setSelectedId(duplicate.id);
  };
  const change=(key:string,value:unknown)=>{
    if(!selected)return;
    setNodes((current)=>current.map((node)=>node.id===selected.id?{...node,data:{...node.data,[key]:value}}:node));
  };
  const onDrop=(event:React.DragEvent)=>{
    event.preventDefault();const type=event.dataTransfer.getData("application/flowprint-node") as NodeKind;
    if(["start","activity","wait","end"].includes(type))addNode(type,flow.screenToFlowPosition({x:event.clientX,y:event.clientY}));
  };
  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      if(target&&["INPUT","TEXTAREA","SELECT"].includes(target.tagName))return;
      if(event.key==="Delete"||event.key==="Backspace"){if(selectedId){event.preventDefault();removeSelected();}}
    };
    window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);
  },[selectedId,nodes,edges]);
  const saveNow=()=>{updateScenario(scenario.id,{graph:{nodes,edges,schemaVersion:scenario.graph.schemaVersion||1}});setSaveState("saved");toast.success("Workflow To-Be tersimpan di Supabase/demo workspace.");};

  return <div className="studio-layout scenario-canvas-layout">
    <aside className="studio-panel left"><h3>To-Be nodes</h3><p className="panel-caption">Tambah node, lalu sambungkan handle-nya untuk menyusun target.</p><div className="palette-items">{palette.map(({type,label,icon:Icon,color})=><button key={type} className="palette-item" draggable onDragStart={(event)=>{event.dataTransfer.setData("application/flowprint-node",type);event.dataTransfer.effectAllowed="move";}} onClick={()=>addNode(type)} style={{width:"100%",textAlign:"left",background:"#fff"}}><span className="palette-icon" style={{background:`${color}15`,color}}><Icon size={13}/></span><span className="palette-copy"><b>{label}</b><span>Click or drag to canvas</span></span></button>)}</div><div className={`validation-box ${validation.valid?"valid":"invalid"}`}><b>{validation.valid?"To-Be valid":"Validation needed"}</b><div style={{marginTop:4}}>{validation.valid?"One connected Start → End path.":validation.issues.slice(0,3).join(" ")}</div></div><p style={{fontSize:8,color:"#9298a7",lineHeight:1.6,marginTop:10}}>Target graph disimpan terpisah dari baseline. Analisis simulasi dijeda jika To-Be belum valid.</p></aside>
    <section className="canvas-wrap" onDrop={onDrop} onDragOver={(e)=>{e.preventDefault();e.dataTransfer.dropEffect="move";}}>
      <div className="canvas-toolbar"><div className="canvas-controls"><button className="icon-button" title="Fit view" onClick={()=>flow.fitView({padding:.24,duration:250})}><MousePointer2 size={13}/></button><button className="icon-button" title="Tambah activity" onClick={()=>addNode("activity")}><Plus size={14}/></button></div><span className={`save-status ${saveState}`}><i/>{saveState==="saving"?"Menyimpan…":saveState==="error"?"Gagal menyimpan":"Tersimpan"}</span></div>
      <ReactFlow<FlowNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChangeSafe} onEdgesChange={onEdgesChangeSafe} onConnect={connect} onNodeClick={(_,node)=>setSelectedId(node.id)} onPaneClick={()=>setSelectedId(null)} onInit={(instance)=>instance.fitView({padding:.24})} fitView snapToGrid snapGrid={[18,18]} deleteKeyCode={["Delete","Backspace"]} selectionOnDrag panOnDrag={[1,2]} minZoom={.25} maxZoom={1.6} attributionPosition="bottom-center">
        <Background color="#e0e2eb" gap={18} size={1}/><Controls position="bottom-left" showInteractive={false}/><MiniMap position="bottom-right" pannable zoomable nodeColor={(node)=>node.type==="start"?"#16a394":node.type==="end"?"#4d8f77":node.type==="wait"?"#d59635":"#665cf0"} maskColor="rgba(245,245,252,.65)"/>
      </ReactFlow>
    </section>
    <aside className="studio-panel right"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3>Target inspector</h3>{selected&&<div style={{display:"flex",gap:2}}><button className="icon-button" title="Duplicate" onClick={duplicateSelected}><Copy size={12}/></button><button className="icon-button" title="Delete" onClick={removeSelected}><Trash2 size={12}/></button></div>}</div><p className="panel-caption">{selected?`Properties · ${selected.type}`:"Select a node to edit its assumptions."}</p>
      {!selected?<div className="empty-state" style={{padding:"28px 5px",fontSize:9}}><Workflow size={19} style={{margin:"0 auto 8px",color:"#aaa6eb"}}/>Pilih node pada canvas.</div>:<>
        <Field label="Nama node"><input value={selected.data.label} onChange={(e)=>change("label",e.target.value)}/></Field>
        {(selected.type==="activity"||selected.type==="wait")&&<>
          <Field label="Deskripsi"><textarea value={selected.data.description} onChange={(e)=>change("description",e.target.value)} placeholder="Konteks target…"/></Field>
          <Field label="Pemilik peran / departemen"><input value={selected.data.ownerRole} onChange={(e)=>change("ownerRole",e.target.value)} placeholder="Operations"/></Field>
          <div className="inspector-grid">{selected.type==="activity"&&<Field label="Mode kerja"><select value={selected.data.workMode} onChange={(e)=>change("workMode",e.target.value)}><option value="manual">Manual</option><option value="semi_automated">Semi-otomatis</option><option value="automated">Otomatis</option></select></Field>}<Field label={selected.type==="wait"?"Durasi tunggu (mnt)":"Effort (mnt)"}><input type="number" min="0" value={selected.type==="wait"?selected.data.waitMinutes:selected.data.effortMinutes} onChange={(e)=>change(selected.type==="wait"?"waitMinutes":"effortMinutes",Math.max(0,Number(e.target.value)))}/></Field></div>
          {selected.type==="activity"&&<><div className="inspector-grid"><Field label="Wait (mnt)"><input type="number" min="0" value={selected.data.waitMinutes} onChange={(e)=>change("waitMinutes",Math.max(0,Number(e.target.value)))}/></Field><Field label="Sistem / tool"><input value={selected.data.systemName} onChange={(e)=>change("systemName",e.target.value)} placeholder="API / ERP"/></Field></div><hr className="inspector-divider"/><div className="tiny muted" style={{marginBottom:8}}>Opportunity factors · 1–5</div><div className="inspector-grid">{([["repeatability","Repetisi"],["standardization","Standar"],["errorImpact","Dampak error"],["integrationReadiness","Integrasi"]] as const).map(([key,label])=><Field label={label} key={key}><select value={selected.data[key]} onChange={(e)=>change(key,Number(e.target.value))}>{[1,2,3,4,5].map((n)=><option value={n} key={n}>{n} / 5</option>)}</select></Field>)}</div></>}
        </>}
        <div className="metric-foot" style={{marginTop:7}}><span>{selected.type==="activity"?`${minutes(selected.data.effortMinutes)} effort · ${modeLabels[selected.data.workMode]}`:selected.type==="wait"?`${minutes(selected.data.waitMinutes)} waiting`:selected.type}</span><span>{Math.round(selected.position.x)},{Math.round(selected.position.y)}</span></div>
        <button className="button small" onClick={saveNow} style={{marginTop:11,width:"100%"}}>Simpan target</button>
      </>}
    </aside>
  </div>;
}

export function ScenarioCanvasEditor({scenario,graphRef}:{scenario:Scenario;graphRef:MutableRefObject<CanvasGraphSnapshot|null>}){
  return <ReactFlowProvider><Editor key={scenario.id} scenario={scenario} graphRef={graphRef}/></ReactFlowProvider>;
}
