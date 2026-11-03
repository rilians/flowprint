import { describe, expect, it } from "vitest";
import { validateWorkflow } from "./validation";
import { demoProcesses } from "./demo-data";
import type { FlowNode } from "./types";

const process=demoProcesses[0];

describe("workflow validation",()=>{
  it("accepts a connected linear path from exactly one start to one end",()=>{
    expect(validateWorkflow(process.graph)).toMatchObject({valid:true,issues:[]});
  });
  it("identifies disconnected nodes",()=>{
    const extra:FlowNode={id:"loose",type:"activity",position:{x:0,y:0},data:{...process.graph.nodes[1].data,label:"Disconnected"}};
    const result=validateWorkflow({...process.graph,nodes:[...process.graph.nodes,extra]});
    expect(result.valid).toBe(false);
    expect(result.issues.join(" ")).toContain("belum terhubung");
    expect(result.invalidNodeIds).toContain("loose");
  });
  it("rejects cycles and invalid edges",()=>{
    const end=process.graph.nodes.find((n)=>n.type==="end")!;
    const start=process.graph.nodes.find((n)=>n.type==="start")!;
    const result=validateWorkflow({...process.graph,edges:[...process.graph.edges,{id:"cycle",source:end.id,target:start.id}]});
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue)=>issue.toLowerCase().includes("koneksi")||issue.toLowerCase().includes("siklus"))).toBe(true);
  });
  it("rejects missing start and end nodes",()=>{
    const result=validateWorkflow({...process.graph,nodes:process.graph.nodes.filter((n)=>n.type!=="end")});
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue)=>issue.includes("tepat satu node Selesai"))).toBe(true);
  });
});
