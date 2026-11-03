import { describe, expect, it } from "vitest";
import { AiProcessContextSchema } from "@/lib/ai/contracts";
import { toAiProcessContext } from "@/lib/ai/client";
import { demoProcesses } from "@/lib/demo-data";

describe("Gemini request contracts", () => {
  it("sends only the bounded process context required by discovery and To-Be drafting", () => {
    const context = toAiProcessContext(demoProcesses[0]);
    const parsed = AiProcessContextSchema.safeParse(context);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe(demoProcesses[0].name);
      expect(parsed.data.graph.nodes).toHaveLength(demoProcesses[0].graph.nodes.length);
      expect(parsed.data.graph.nodes[0].data).not.toHaveProperty("ownerEmail");
    }
  });
});
