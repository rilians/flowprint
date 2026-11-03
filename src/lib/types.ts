import type { Edge, Node } from "@xyflow/react";

export type NodeKind = "start" | "activity" | "wait" | "end";
export type WorkMode = "manual" | "semi_automated" | "automated";

export type FlowNodeData = {
  label: string;
  description: string;
  ownerRole: string;
  workMode: WorkMode;
  effortMinutes: number;
  waitMinutes: number;
  systemName: string;
  repeatability: number;
  standardization: number;
  errorImpact: number;
  integrationReadiness: number;
  department?: string;
  [key: string]: unknown;
};

export type FlowNode = Node<FlowNodeData, NodeKind>;
export type FlowEdge = Edge;

export type WorkflowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  schemaVersion: number;
};

export type BusinessProcess = {
  id: string;
  name: string;
  description: string;
  department: string;
  monthlyVolume: number;
  currency: string;
  hourlyLaborCost: number;
  graph: WorkflowGraph;
  updatedAt: string;
  createdAt: string;
  analysisStatus: "analyzed" | "draft";
};

export type Scenario = {
  id: string;
  processId: string;
  name: string;
  description: string;
  graph: WorkflowGraph;
  adoptionRate: number;
  implementationCost: number;
  updatedAt: string;
  createdAt: string;
};

export type Priority = "high" | "medium" | "low";
export type RecommendationCategory = "Automate" | "Standardize" | "Integrate" | "Reduce waiting" | "Simplify";

export type Opportunity = {
  id: string;
  processId: string;
  nodeId: string;
  activityName: string;
  score: number;
  priority: Priority;
  category: RecommendationCategory;
  explanation: string;
  factors: string[];
  nextAction: string;
  focus: string;
};

export type ProcessMetrics = {
  activityCount: number;
  manualCount: number;
  semiAutomatedCount: number;
  automatedCount: number;
  humanEffortMinutes: number;
  waitingMinutes: number;
  cycleMinutes: number;
  monthlyHours: number;
  monthlyCost: number;
};
