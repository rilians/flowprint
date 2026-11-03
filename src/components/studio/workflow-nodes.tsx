"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Activity, Check, Clock3, Play } from "lucide-react";
import type { FlowNode, NodeKind } from "@/lib/types";
import { minutes, modeLabels } from "@/lib/format";

function FlowNodeCard({ data, selected, type }: NodeProps<FlowNode>) {
  const kind = type as NodeKind;
  const themes = {
    start:{ icon:Play, color:"#16a394", soft:"#e8f8f5", label:"START" },
    activity:{ icon:Activity, color:"#665cf0", soft:"#efedff", label:"ACTIVITY" },
    wait:{ icon:Clock3, color:"#d59635", soft:"#fff5e6", label:"WAIT" },
    end:{ icon:Check, color:"#4d8f77", soft:"#eaf6ef", label:"END" },
  };
  const theme = themes[kind] || themes.activity;
  const Icon = theme.icon;
  return <div className={`workflow-node ${selected ? "selected" : ""}`}>
    {kind !== "start" && <Handle type="target" position={Position.Top} style={{ width:7,height:7,background:theme.color,border:0 }}/>}
    <div className="node-head"><span className="node-badge" style={{ background:theme.soft,color:theme.color }}><Icon size={11}/></span><b title={data.label}>{data.label || theme.label}</b><span className="tiny muted" style={{ marginLeft:"auto", fontSize:7 }}>{theme.label}</span></div>
    {(kind === "activity" || kind === "wait") && <div className="node-body">
      <small>{data.ownerRole || (kind === "wait" ? "Waktu tunggu" : "Belum ada pemilik")}{data.systemName ? ` · ${data.systemName}` : ""}</small>
      <div className="node-metric"><span>{kind === "wait" ? "Durasi" : "Effort"}</span><strong>{kind === "wait" ? minutes(data.waitMinutes) : minutes(data.effortMinutes)}</strong></div>
      {kind === "activity" && <div className="node-metric" style={{ marginTop:4 }}><span>Mode kerja</span><strong>{modeLabels[data.workMode]}</strong></div>}
      {kind === "activity" && data.waitMinutes > 0 && <div className="node-metric" style={{ marginTop:4 }}><span>Waktu tunggu</span><strong>{minutes(data.waitMinutes)}</strong></div>}
    </div>}
    {kind === "start" && <div className="node-body"><small>Alur dimulai di sini</small></div>}
    {kind === "end" && <div className="node-body"><small>Alur berakhir di sini</small></div>}
    {kind !== "end" && <Handle type="source" position={Position.Bottom} style={{ width:7,height:7,background:theme.color,border:0 }}/>}
  </div>;
}

export const nodeTypes = {
  start: memo(FlowNodeCard),
  activity: memo(FlowNodeCard),
  wait: memo(FlowNodeCard),
  end: memo(FlowNodeCard),
};
