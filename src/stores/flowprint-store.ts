import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cloneGraph, updateNode } from "@/lib/calculations";
import { demoProcesses, demoScenarios } from "@/lib/demo-data";
import type { BusinessProcess, FlowNode, RecommendationCategory, Scenario, WorkflowGraph } from "@/lib/types";

const time = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

type Store = {
  processes: BusinessProcess[];
  scenarios: Scenario[];
  dismissedOpportunityIds: string[];
  hydrated: boolean;
  syncStatus: "demo" | "connecting" | "synced" | "error";
  authEmail: string | null;
  syncError: string | null;
  markHydrated: () => void;
  setSyncStatus: (status: Store["syncStatus"], email?: string | null, error?: string | null) => void;
  replaceCloudData: (processes: BusinessProcess[], scenarios: Scenario[]) => void;
  addProcess: (process: BusinessProcess) => void;
  updateProcess: (id: string, changes: Partial<BusinessProcess>) => void;
  updateProcessGraph: (id: string, graph: WorkflowGraph) => void;
  deleteProcess: (id: string) => void;
  resetDemo: () => void;
  createScenario: (processId: string, name?: string) => string;
  updateScenario: (id: string, changes: Partial<Scenario>) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => string | null;
  applyRecommendation: (processId: string, nodeId: string, category: RecommendationCategory, name: string, targetScenarioId?: string | null) => string | null;
  dismissOpportunity: (id: string) => void;
  restoreOpportunity: (id: string) => void;
};

export const useFlowprintStore = create<Store>()(persist((set, get) => ({
  processes: demoProcesses,
  scenarios: demoScenarios,
  dismissedOpportunityIds: [],
  hydrated: false,
  syncStatus: "demo",
  authEmail: null,
  syncError: null,
  markHydrated: () => set({ hydrated: true }),
  setSyncStatus: (syncStatus, authEmail = null, syncError = null) => set({ syncStatus, authEmail, syncError }),
  replaceCloudData: (processes, scenarios) => set({ processes, scenarios, dismissedOpportunityIds: [] }),
  addProcess: (process) => set((state) => ({ processes: [{ ...process, createdAt: process.createdAt || time(), updatedAt: time() }, ...state.processes] })),
  updateProcess: (id, changes) => set((state) => ({ processes: state.processes.map((p) => p.id === id ? { ...p, ...changes, updatedAt: time() } : p) })),
  updateProcessGraph: (id, graph) => set((state) => ({ processes: state.processes.map((p) => p.id === id ? { ...p, graph, updatedAt: time() } : p) })),
  deleteProcess: (id) => set((state) => ({ processes: state.processes.filter((p) => p.id !== id), scenarios: state.scenarios.filter((s) => s.processId !== id) })),
  resetDemo: () => set({ processes: demoProcesses, scenarios: demoScenarios, dismissedOpportunityIds: [] }),
  createScenario: (processId, name) => {
    const process = get().processes.find((p) => p.id === processId);
    if (!process) return "";
    const id = makeId("scenario");
    const scenario: Scenario = {
      id, processId, name: name || "Skenario perbaikan", description: "Salinan To-Be terpisah dari baseline proses.", graph: cloneGraph(process.graph), adoptionRate: 0.8, implementationCost: 0, createdAt: time(), updatedAt: time(),
    };
    set((state) => ({ scenarios: [scenario, ...state.scenarios] }));
    return id;
  },
  updateScenario: (id, changes) => set((state) => ({ scenarios: state.scenarios.map((s) => s.id === id ? { ...s, ...changes, updatedAt: time() } : s) })),
  deleteScenario: (id) => set((state) => ({ scenarios: state.scenarios.filter((s) => s.id !== id) })),
  duplicateScenario: (id) => {
    const original = get().scenarios.find((s) => s.id === id);
    if (!original) return null;
    const copy: Scenario = { ...original, id: makeId("scenario"), name: `${original.name} — salinan`, graph: cloneGraph(original.graph), createdAt: time(), updatedAt: time() };
    set((state) => ({ scenarios: [copy, ...state.scenarios] }));
    return copy.id;
  },
  applyRecommendation: (processId, nodeId, category, name, targetScenarioId) => {
    const process = get().processes.find((p) => p.id === processId);
    if (!process) return null;
    let scenario = targetScenarioId === undefined
      ? get().scenarios.find((s) => s.processId === processId)
      : targetScenarioId === null
      ? undefined
      : get().scenarios.find((s) => s.id === targetScenarioId && s.processId === processId);
    if (targetScenarioId && !scenario) return null;
    if (!scenario) {
      const id = makeId("scenario");
      scenario = { id, processId, name: "Skenario perbaikan", description: "Perubahan yang diusulkan dari opportunity discovery.", graph: cloneGraph(process.graph), adoptionRate: 0.8, implementationCost: 0, createdAt: time(), updatedAt: time() };
      set((state) => ({ scenarios: [scenario!, ...state.scenarios] }));
    }
    if (!scenario.graph.nodes.some((node) => node.id === nodeId)) return null;
    const graph = updateNode(scenario.graph, nodeId, (node: FlowNode) => {
      const data = { ...node.data };
      if (category === "Automate") { data.workMode = "automated"; data.effortMinutes = Math.round(data.effortMinutes * 0.15); }
      else if (category === "Integrate") { data.workMode = data.workMode === "manual" ? "semi_automated" : "automated"; data.effortMinutes = Math.round(data.effortMinutes * 0.5); }
      else if (category === "Standardize") { data.effortMinutes = Math.round(data.effortMinutes * 0.75); data.standardization = 5; }
      else if (category === "Reduce waiting") { data.waitMinutes = Math.round(data.waitMinutes * 0.35); }
      else if (category === "Simplify") { data.effortMinutes = Math.round(data.effortMinutes * 0.8); }
      return { ...node, data };
    });
    set((state) => ({ scenarios: state.scenarios.map((s) => s.id === scenario!.id ? { ...s, name: s.name || name, graph, updatedAt: time() } : s) }));
    return scenario.id;
  },
  dismissOpportunity: (id) => set((state) => ({ dismissedOpportunityIds: [...new Set([...state.dismissedOpportunityIds, id])] })),
  restoreOpportunity: (id) => set((state) => ({ dismissedOpportunityIds: state.dismissedOpportunityIds.filter((item) => item !== id) })),
}), {
  name: "flowprint-demo-v1",
  version: 1,
  skipHydration: true,
  partialize: (state) => ({ processes: state.processes, scenarios: state.scenarios, dismissedOpportunityIds: state.dismissedOpportunityIds }) as Store,
  onRehydrateStorage: () => (state) => state?.markHydrated(),
}));
