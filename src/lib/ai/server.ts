import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class AiRouteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AiRouteError";
  }
}

type JsonSchema = Record<string, unknown>;
type GeminiResponse = {
  output_text?: string;
  status?: string;
  steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  error?: { status?: string; message?: string };
};

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_PER_USER = 12;
const GEMINI_REQUEST_TIMEOUT_MS = 55_000;
const GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";
const globalForAi = globalThis as typeof globalThis & { __flowprintAiRateBuckets?: Map<string, number[]> };
const rateBuckets = globalForAi.__flowprintAiRateBuckets ??= new Map<string, number[]>();

function geminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(geminiSchema);
  if (!value || typeof value !== "object") return value;
  const unsupported = new Set(["$schema", "minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems"]);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !unsupported.has(key)).map(([key, item]) => [key, geminiSchema(item)]));
}

async function getSupabaseUserId(client: SupabaseClient | null) {
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function requireAiUser() {
  const client = await createSupabaseServerClient();
  const userId = await getSupabaseUserId(client);
  if (!userId) throw new AiRouteError("Masuk ke workspace untuk memakai fitur Gemini AI.", 401);
  return userId;
}

export function consumeAiQuota(userId: string) {
  const now = Date.now();
  const recent = (rateBuckets.get(userId) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_PER_USER) return false;
  recent.push(now);
  rateBuckets.set(userId, recent);
  return true;
}

export async function generateGeminiJson<T>(options: {
  systemInstruction: string;
  prompt: string;
  responseJsonSchema: JsonSchema;
  maxOutputTokens: number;
}): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiRouteError("Gemini belum dikonfigurasi. Tambahkan GEMINI_API_KEY sebagai secret server-side.", 503);
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(model)) throw new AiRouteError("Nama model Gemini tidak valid.", 500);
  const requestModel = (requestedModel: string) => fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": "2026-05-20" },
    signal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      model: requestedModel,
      store: false,
      system_instruction: options.systemInstruction,
      input: options.prompt,
      response_format: { type: "text", mime_type: "application/json", schema: geminiSchema(options.responseJsonSchema) },
      generation_config: { temperature: 0.25, max_output_tokens: options.maxOutputTokens },
    }),
  });
  let response: Response;
  try {
    response = await requestModel(model);
    if (response.status === 503 && model !== GEMINI_FALLBACK_MODEL) {
      console.warn("[Gemini API] model overloaded; retrying with fallback", { model, fallbackModel: GEMINI_FALLBACK_MODEL });
      response = await requestModel(GEMINI_FALLBACK_MODEL);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error("[Gemini API] request timed out", { timeoutMs: GEMINI_REQUEST_TIMEOUT_MS });
      throw new AiRouteError(`Gemini belum merespons setelah ${GEMINI_REQUEST_TIMEOUT_MS / 1000} detik. Coba lagi; periksa log server jika berulang.`, 504);
    }
    console.error("[Gemini API] connection failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw new AiRouteError("Tidak dapat menghubungi Gemini. Coba lagi beberapa saat.", 502);
  }
  const payload = await response.json().catch(() => null) as GeminiResponse | null;
  if (!response.ok) {
    const providerStatus = payload?.error?.status && /^[A-Z0-9_]{1,60}$/.test(payload.error.status)
      ? payload.error.status
      : undefined;
    const providerMessage = payload?.error?.message
      ?.replaceAll(apiKey, "[redacted]")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 300);
    console.error("[Gemini API] request failed", {
      httpStatus: response.status,
      providerStatus,
      message: providerMessage,
    });
    const diagnostic = ` (${response.status}${providerStatus ? ` ${providerStatus}` : ""})`;
    const message = response.status === 429
      ? `Kuota atau rate limit Gemini tercapai${diagnostic}. Coba lagi nanti.`
      : response.status === 400
        ? `Gemini menolak format permintaan${diagnostic}.${providerMessage ? ` Detail: ${providerMessage}` : " Periksa schema dan parameter request di log server."}`
        : response.status === 401 || response.status === 403
          ? `Gemini menolak akses${diagnostic}. Periksa GEMINI_API_KEY dan izin API. Detail tersedia di log terminal server.`
          : response.status === 404
            ? `Model atau endpoint Gemini tidak ditemukan${diagnostic}. Periksa GEMINI_MODEL.`
            : response.status === 503
              ? `Layanan Gemini sedang padat${diagnostic}. Tunggu sebentar lalu coba lagi.`
            : `Permintaan Gemini gagal${diagnostic}. Detail tersedia di log terminal server.`;
    const status = response.status === 429 || response.status === 503 ? response.status : 502;
    throw new AiRouteError(message, status);
  }
  const text = (payload?.output_text || payload?.steps?.filter((step) => step.type === "model_output").flatMap((step) => step.content || []).map((part) => part.text || "").join(""))?.trim();
  if (!text || (payload?.status && payload.status !== "completed")) throw new AiRouteError("Gemini tidak mengembalikan draft yang dapat dibaca.", 502);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiRouteError("Respons Gemini bukan JSON yang valid. Coba lagi.", 502);
  }
}

export function aiErrorResponse(error: unknown) {
  if (error instanceof AiRouteError) {
    const headers = error.status === 429 ? { "Retry-After": "3600" } : undefined;
    return Response.json({ error: error.message }, { status: error.status, headers });
  }
  return Response.json({ error: "Terjadi kesalahan saat menyiapkan permintaan AI." }, { status: 500 });
}

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}
