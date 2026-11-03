import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cloneGraph } from "@/lib/calculations";
import { demoProcesses, demoScenarios } from "@/lib/demo-data";

let useFlowprintStore: typeof import("@/stores/flowprint-store").useFlowprintStore;
const storage = new Map<string, string>();

beforeAll(async () => {
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { localStorage });
  ({ useFlowprintStore } = await import("@/stores/flowprint-store"));
});
afterAll(() => vi.unstubAllGlobals());

describe("scenario-targeted recommendations", () => {
  const process = demoProcesses[0];
  const template = demoScenarios[0];
  const first = { ...template, id: "scenario-first", graph: cloneGraph(process.graph) };
  const second = { ...template, id: "scenario-second", graph: cloneGraph(process.graph) };

  beforeEach(() => {
    useFlowprintStore.setState({ processes: [process], scenarios: [first, second] });
  });

  it("updates only the selected scenario", () => {
    const id = useFlowprintStore.getState().applyRecommendation(process.id, "reim-form", "Simplify", "Form entry", second.id);
    expect(id).toBe(second.id);
    const state = useFlowprintStore.getState();
    const unchanged = state.scenarios.find((scenario) => scenario.id === first.id)!;
    const updated = state.scenarios.find((scenario) => scenario.id === second.id)!;
    expect(unchanged.graph.nodes.find((node) => node.id === "reim-form")?.data.effortMinutes).toBe(10);
    expect(updated.graph.nodes.find((node) => node.id === "reim-form")?.data.effortMinutes).toBe(8);
  });

  it("does not mutate a selected scenario missing the baseline activity", () => {
    const id = useFlowprintStore.getState().applyRecommendation(process.id, "missing-activity", "Simplify", "Missing", second.id);
    expect(id).toBeNull();
    expect(useFlowprintStore.getState().scenarios[1].graph).toEqual(second.graph);
  });
});
