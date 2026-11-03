import { isAiConfigured } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    configured: isAiConfigured(),
    provider: "Google AI Studio",
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  });
}
