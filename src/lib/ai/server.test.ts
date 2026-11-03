import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiToBeJsonSchema } from "@/lib/ai/contracts";
import { generateGeminiJson } from "@/lib/ai/server";

const request = {
  systemInstruction: "test",
  prompt: "test",
  responseJsonSchema: { type: "object" },
  maxOutputTokens: 100,
};

const originalApiKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

describe("Gemini API errors", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.GEMINI_MODEL;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the available Gemini 3.6 Flash model by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "completed",
      output_text: "{}",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateGeminiJson(request)).resolves.toEqual({});
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe("gemini-3.6-flash");
  });

  it("omits long array bounds from the provider schema while retaining the To-Be response shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "completed",
      output_text: "{}",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateGeminiJson({
      ...request,
      responseJsonSchema: AiToBeJsonSchema as Record<string, unknown>,
    })).resolves.toEqual({});

    const sentSchema = JSON.parse(fetchMock.mock.calls[0][1].body).response_format.schema;
    const serializedSchema = JSON.stringify(sentSchema);
    expect(serializedSchema).not.toMatch(/"(minItems|maxItems)"/);
    expect(sentSchema.properties).toHaveProperty("graph");
    expect(sentSchema.properties).toHaveProperty("assumptions");
  });

  it("reports the upstream status while keeping provider details in server logs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { status: "PERMISSION_DENIED", message: "API key does not have access" },
    }), { status: 403 })));

    await expect(generateGeminiJson(request)).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("(403 PERMISSION_DENIED)"),
    });
    expect(console.error).toHaveBeenCalledWith("[Gemini API] request failed", {
      httpStatus: 403,
      providerStatus: "PERMISSION_DENIED",
      message: "API key does not have access",
    });
  });

  it("shows a sanitized provider explanation for malformed requests", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: "Invalid JSON schema: unsupported field\r\nAPI key: test-key" },
    }), { status: 400 })));

    const error = await generateGeminiJson(request).catch((failure: unknown) => failure);
    expect(error).toMatchObject({ status: 502 });
    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toContain("Detail: Invalid JSON schema: unsupported field API key: [redacted]");
    }
  });

  it("preserves quota errors as 429 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded" },
    }), { status: 429 })));

    await expect(generateGeminiJson(request)).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining("(429 RESOURCE_EXHAUSTED)"),
    });
  });

  it("reports Gemini service overload as a retryable 503", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: "Model is experiencing high demand" },
      }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: "Fallback model is also busy" },
      }), { status: 503 })));

    await expect(generateGeminiJson(request)).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining("Layanan Gemini sedang padat (503)"),
    });
  });

  it("retries an overloaded model with the fallback model", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: "Model is experiencing high demand" },
      }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "completed",
        output_text: "{\"summary\":\"ok\"}",
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateGeminiJson(request)).resolves.toEqual({ summary: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((call) => JSON.parse(call[1].body).model)).toEqual([
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
    ]);
  });

  it("reports an upstream timeout as a gateway timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Request timed out", "TimeoutError")));

    await expect(generateGeminiJson(request)).rejects.toMatchObject({
      status: 504,
      message: expect.stringContaining("55 detik"),
    });
    expect(console.error).toHaveBeenCalledWith("[Gemini API] request timed out", { timeoutMs: 55_000 });
  });
});
