import type { BusinessProcess, FlowNode, WorkflowGraph } from "@/lib/types";
import type { AiProcessContext } from "@/lib/ai/contracts";

function safeNode(node: FlowNode) {
  return {
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.data.label,
      description: node.data.description,
      ownerRole: node.data.ownerRole,
      workMode: node.data.workMode,
      effortMinutes: node.data.effortMinutes,
      waitMinutes: node.data.waitMinutes,
      systemName: node.data.systemName,
      repeatability: node.data.repeatability,
      standardization: node.data.standardization,
      errorImpact: node.data.errorImpact,
      integrationReadiness: node.data.integrationReadiness,
    },
  };
}

export function toAiGraph(graph: WorkflowGraph): AiProcessContext["graph"] {
  return {
    nodes: graph.nodes.map(safeNode),
    edges: graph.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
  };
}

export function toAiProcessContext(process: BusinessProcess): AiProcessContext {
  return {
    name: process.name,
    description: process.description,
    department: process.department,
    monthlyVolume: process.monthlyVolume,
    graph: toAiGraph(process.graph),
  };
}
