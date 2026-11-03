import { describe, expect, it } from "vitest";
import { calculateOpportunityScore, calculateProcessMetrics, calculateScenarioComparison, opportunityPriority } from "./calculations";
import { demoProcesses, demoScenarios } from "./demo-data";
import { generateOpportunities } from "./recommendations";
import type { FlowNode } from "./types";

const reimbursement=demoProcesses[0];

describe("process metrics",()=>{
  it("calculates human effort, waiting, cycle time, monthly workload and cost from the graph",()=>{
    const result=calculateProcessMetrics(reimbursement.graph,reimbursement.monthlyVolume,reimbursement.hourlyLaborCost);
    expect(result.humanEffortMinutes).toBe(60);
    expect(result.waitingMinutes).toBe(480);
    expect(result.cycleMinutes).toBe(540);
    expect(result.monthlyHours).toBe(420);
    expect(result.monthlyCost).toBe(27300000);
  });
  it("treats invalid negative inputs as zero",()=>{
    const graph={...reimbursement.graph,nodes:reimbursement.graph.nodes.map((node)=>node.type==="activity"?{...node,data:{...node.data,effortMinutes:-9,waitMinutes:NaN}}:node)};
    const result=calculateProcessMetrics(graph,-20,-1);
    expect(result.humanEffortMinutes).toBe(0);
    expect(result.waitingMinutes).toBe(0);
    expect(result.monthlyHours).toBe(0);
    expect(result.monthlyCost).toBe(0);
  });
});

describe("opportunity score",()=>{
  it("scores all maximum factors at 100 and clamps input ranges",()=>{
    const node=reimbursement.graph.nodes.find((n)=>n.id==="reim-approve") as FlowNode;
    const max:FlowNode={...node,data:{...node.data,workMode:"manual",repeatability:5,standardization:5,errorImpact:5,integrationReadiness:5,waitMinutes:120}};
    expect(calculateOpportunityScore(max,800)).toBe(100);
    expect(opportunityPriority(100)).toBe("high");
  });
  it("classifies the defined priority bands",()=>{
    expect(opportunityPriority(75)).toBe("high");
    expect(opportunityPriority(74)).toBe("medium");
    expect(opportunityPriority(55)).toBe("medium");
    expect(opportunityPriority(54)).toBe("low");
  });
  it("generates transparent recommendations from actual node inputs",()=>{
    const opportunities=generateOpportunities(reimbursement);
    expect(opportunities.length).toBeGreaterThan(0);
    expect(opportunities.some((item)=>item.category==="Automate")).toBe(true);
    expect(opportunities.some((item)=>item.category==="Reduce waiting")).toBe(true);
    expect(opportunities.some((item)=>item.priority==="high")).toBe(true);
    expect(opportunities.every((item)=>item.explanation.length>20&&item.factors.length>0&&item.nextAction.length>10)).toBe(true);
  });
});

describe("scenario comparison",()=>{
  it("applies adoption rate to estimated hours and calculates payback",()=>{
    const comparison=calculateScenarioComparison(reimbursement,demoScenarios[0]);
    expect(comparison.positiveSavings).toBe(true);
    expect(comparison.monthlyHoursSaved).toBeCloseTo(236.25);
    expect(comparison.monthlyCostSaved).toBeCloseTo(15356250);
    expect(comparison.paybackMonths).toBeCloseTo(50000000/15356250);
  });
  it("does not show payback for zero or negative savings",()=>{
    const unchanged={...demoScenarios[0],graph:reimbursement.graph,implementationCost:1000000};
    const comparison=calculateScenarioComparison(reimbursement,unchanged);
    expect(comparison.monthlyHoursSaved).toBe(0);
    expect(comparison.positiveSavings).toBe(false);
    expect(comparison.paybackMonths).toBeNull();
    const worse={...unchanged,graph:{...reimbursement.graph,nodes:reimbursement.graph.nodes.map((n)=>n.id==="reim-form"?{...n,data:{...n.data,effortMinutes:30}}:n)}};
    expect(calculateScenarioComparison(reimbursement,worse).paybackMonths).toBeNull();
  });
});
