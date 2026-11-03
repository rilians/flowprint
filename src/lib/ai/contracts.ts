import { z } from "zod";

export const AiNodeKindSchema = z.enum(["start", "activity", "wait", "end"]);
export const AiWorkModeSchema = z.enum(["manual", "semi_automated", "automated"]);
const positionSchema = z.object({ x: z.number().finite().min(-10000).max(10000), y: z.number().finite().min(-10000).max(10000) });
const nodeDataSchema = z.object({
  label: z.string().trim().min(1).max(140),
  description: z.string().max(500),
  ownerRole: z.string().max(120),
  workMode: AiWorkModeSchema,
  effortMinutes: z.number().finite().min(0).max(1000000),
  waitMinutes: z.number().finite().min(0).max(1000000),
  systemName: z.string().max(160),
  repeatability: z.number().int().min(1).max(5),
  standardization: z.number().int().min(1).max(5),
  errorImpact: z.number().int().min(1).max(5),
  integrationReadiness: z.number().int().min(1).max(5),
});

export const AiContextNodeSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: AiNodeKindSchema,
  position: positionSchema,
  data: nodeDataSchema,
});
export const AiContextEdgeSchema = z.object({
  id: z.string().max(100).optional(),
  source: z.string().trim().min(1).max(80),
  target: z.string().trim().min(1).max(80),
});
export const AiContextGraphSchema = z.object({
  nodes: z.array(AiContextNodeSchema).min(2).max(60),
  edges: z.array(AiContextEdgeSchema).max(120),
});
export const AiProcessContextSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(800),
  department: z.string().max(120),
  monthlyVolume: z.number().int().min(0).max(1000000),
  graph: AiContextGraphSchema,
});

const findingSchema = z.object({
  title: z.string().min(1).max(140),
  observation: z.string().min(1).max(500),
  suggestion: z.string().min(1).max(600),
  relatedNodeIds: z.array(z.string().max(80)).max(8),
  priority: z.enum(["low", "medium", "high"]),
  caveat: z.string().min(1).max(400),
});
export const AiDiscoveryResponseSchema = z.object({
  summary: z.string().min(1).max(900),
  findings: z.array(findingSchema).min(2).max(5),
  questions: z.array(z.string().min(1).max(300)).max(4),
});
export const AiDiscoveryJsonSchema = z.toJSONSchema(AiDiscoveryResponseSchema);

const outputNodeSchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: AiNodeKindSchema,
  position: positionSchema,
  data: nodeDataSchema,
});
const outputEdgeSchema = z.object({
  id: z.string().trim().min(1).max(100),
  source: z.string().trim().min(1).max(80),
  target: z.string().trim().min(1).max(80),
});
export const AiOutputGraphSchema = z.object({
  nodes: z.array(outputNodeSchema).min(3).max(60),
  edges: z.array(outputEdgeSchema).max(120),
});
export const AiToBeResponseSchema = z.object({
  rationale: z.string().min(1).max(900),
  assumptions: z.array(z.string().min(1).max(300)).min(1).max(6),
  graph: AiOutputGraphSchema,
});
export const AiToBeJsonSchema = z.toJSONSchema(AiToBeResponseSchema);

export const AiToBeRequestSchema = z.object({
  process: AiProcessContextSchema,
  currentGraph: AiContextGraphSchema,
  instruction: z.string().trim().max(800).optional().default(""),
});

export type AiProcessContext = z.infer<typeof AiProcessContextSchema>;
export type AiDiscoveryResponse = z.infer<typeof AiDiscoveryResponseSchema>;
export type AiToBeResponse = z.infer<typeof AiToBeResponseSchema>;
