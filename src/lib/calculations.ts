import type { BusinessProcess, FlowNode, ProcessMetrics, Scenario, WorkflowGraph } from "@/lib/types";

const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

export function calculateProcessMetrics(graph: WorkflowGraph, monthlyVolume: number, hourlyLaborCost: number): ProcessMetrics {
  const activities = graph.nodes.filter((node) => node.type === "activity");
  const effort = activities.reduce((sum, node) => sum + safe(node.data.effortMinutes), 0);
  const activityWaiting = activities.reduce((sum, node) => sum + safe(node.data.waitMinutes), 0);
  const explicitWaiting = graph.nodes.filter((node) => node.type === "wait").reduce((sum, node) => sum + safe(node.data.waitMinutes), 0);
  const waiting = activityWaiting + explicitWaiting;
  const monthlyHours = (effort / 60) * safe(monthlyVolume);
  return {
    activityCount: activities.length,
    manualCount: activities.filter((n) => n.data.workMode === "manual").length,
    semiAutomatedCount: activities.filter((n) => n.data.workMode === "semi_automated").length,
    automatedCount: activities.filter((n) => n.data.workMode === "automated").length,
    humanEffortMinutes: effort,
    waitingMinutes: waiting,
    cycleMinutes: effort + waiting,
    monthlyHours,
    monthlyCost: monthlyHours * safe(hourlyLaborCost),
  };
}

export function calculateOpportunityScore(node: FlowNode, monthlyVolume: number): number {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  const d = node.data;
  const volumeScore = Math.min(safe(monthlyVolume) / 500, 1);
  const manualScore = d.workMode === "manual" ? 1 : d.workMode === "semi_automated" ? 0.5 : 0;
  const repeatabilityScore = (clamp(d.repeatability, 1, 5) - 1) / 4;
  const standardizationScore = (clamp(d.standardization, 1, 5) - 1) / 4;
  const waitingScore = Math.min(safe(d.waitMinutes) / 120, 1);
  const errorScore = (clamp(d.errorImpact, 1, 5) - 1) / 4;
  const integrationScore = (clamp(d.integrationReadiness, 1, 5) - 1) / 4;
  const score = volumeScore * 20 + manualScore * 20 + repeatabilityScore * 20 + standardizationScore * 15 + waitingScore * 10 + errorScore * 10 + integrationScore * 5;
  return Math.round(clamp(score, 0, 100));
}

export function opportunityPriority(score: number): "high" | "medium" | "low" {
  return score >= 75 ? "high" : score >= 55 ? "medium" : "low";
}

export type ScenarioComparison = {
  baseline: ProcessMetrics;
  proposed: ProcessMetrics;
  rawMonthlyHoursDelta: number;
  monthlyHoursSaved: number;
  monthlyCostSaved: number;
  cycleTimeSaved: number;
  paybackMonths: number | null;
  positiveSavings: boolean;
};

export function calculateScenarioComparison(process: BusinessProcess, scenario: Scenario): ScenarioComparison {
  const baseline = calculateProcessMetrics(process.graph, process.monthlyVolume, process.hourlyLaborCost);
  const proposed = calculateProcessMetrics(scenario.graph, process.monthlyVolume, process.hourlyLaborCost);
  const rawMonthlyHoursDelta = baseline.monthlyHours - proposed.monthlyHours;
  const monthlyHoursSaved = rawMonthlyHoursDelta * Math.min(1, Math.max(0, scenario.adoptionRate));
  const monthlyCostSaved = monthlyHoursSaved * process.hourlyLaborCost;
  const positiveSavings = monthlyHoursSaved > 0 && monthlyCostSaved > 0;
  const paybackMonths = !positiveSavings ? null : scenario.implementationCost <= 0 ? 0 : scenario.implementationCost / monthlyCostSaved;
  return {
    baseline,
    proposed,
    rawMonthlyHoursDelta,
    monthlyHoursSaved,
    monthlyCostSaved,
    cycleTimeSaved: baseline.cycleMinutes - proposed.cycleMinutes,
    paybackMonths: Number.isFinite(paybackMonths) ? paybackMonths : null,
    positiveSavings,
  };
}

export function cloneGraph(graph: WorkflowGraph): WorkflowGraph {
  if (typeof structuredClone === "function") return structuredClone(graph);
  return JSON.parse(JSON.stringify(graph)) as WorkflowGraph;
}

export function updateNode(graph: WorkflowGraph, nodeId: string, updater: (node: FlowNode) => FlowNode): WorkflowGraph {
  return { ...graph, nodes: graph.nodes.map((node) => node.id === nodeId ? updater(node) : node) };
}
