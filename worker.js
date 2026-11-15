/* Cloudflare Workers entrypoint for the ChatGPT replica.
   Mirrors server.mjs: static assets plus streaming chat and image generation against any
   OpenAI-compatible provider. Configure OPENAI_API_KEY / OPENAI_BASE_URL as Sites secrets. */

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_IMAGE_MODEL = "";

function providerBase(env) {
  return String(env.OPENAI_BASE_URL || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
}

function apiUrl(env, suffix) {
  const base = providerBase(env);
  if (base.endsWith(suffix)) return base;
  const full = base.match(/\/(chat\/completions|images\/generations|completions|responses|audio\/speech)$/);
  if (full) return base.slice(0, -full[0].length) + suffix;
  return base + suffix;
}

function isLocalBase(env) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(providerBase(env));
}

function canCall(env) {
  if (env.OPENAI_API_KEY) return true;
  if (String(env.OPENAI_REQUIRE_KEY || "").toLowerCase() === "false") return true;
  return isLocalBase(env);
}

function upstreamHeaders(env, extra = {}) {
  const headers = { ...extra };
  if (env.OPENAI_API_KEY) headers.authorization = `Bearer ${env.OPENAI_API_KEY}`;
  return headers;
}

function summarize(text) {
  return String(text || "").replace(/\s+/g, " ").slice(0, 400);
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function providerError(status, body) {
  return json(502, {
    error: status === 401 || status === 403 ? "unauthorized" : "upstream_error",
    status,
    detail: summarize(body),
  });
}

async function handleChat(request, env) {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!canCall(env)) return json(503, { error: "no_key" });

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return json(400, { error: "bad_request" });
  }

  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .filter(
          (message) =>
            message &&
            ["user", "assistant", "system"].includes(message.role) &&
            typeof message.content === "string" &&
            message.content.trim()
        )
        .slice(-40)
        .map((message) => ({ role: message.role, content: message.content.slice(0, 16000) }))
    : [];

  if (!messages.length) return json(400, { error: "bad_request" });

  const system = [];
  if (typeof payload.system === "string" && payload.system.trim()) {
    system.push({ role: "system", content: payload.system.trim().slice(0, 8000) });
  }
  if (payload.think === true) {
    system.push({
      role: "system",
      content: "Think through the problem carefully and step by step before answering, then give the final answer.",
    });
  }

  const controller = new AbortController();
  let upstream;
  try {
    upstream = await fetch(apiUrl(env, "/chat/completions"), {
      method: "POST",
      headers: upstreamHeaders(env, { "content-type": "application/json", accept: "text/event-stream, application/json" }),
      body: JSON.stringify({
        model: String(env.OPENAI_MODEL || DEFAULT_MODEL).trim(),
        messages: [...system, ...messages],
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    return json(502, { error: "upstream_unreachable", detail: summarize(err.message) });
  }

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => "");
    return providerError(upstream.status, body);
  }

  const headers = {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
  };
  const contentType = upstream.headers.get("content-type") || "";

  if (!contentType.includes("text/event-stream")) {
    let text = "";
    try {
      const data = await upstream.json();
      const choice = data?.choices?.[0];
      const value = choice?.message?.content ?? choice?.text ?? "";
      text = typeof value === "string" ? value : "";
    } catch (err) {
      text = "";
    }
    const body = text ? `data: ${JSON.stringify({ delta: text })}\n\ndata: [DONE]\n\n` : "data: [DONE]\n\n";
    return new Response(body, { headers });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || "";
        for (const part of parts) {
          for (const rawLine of part.split("\n")) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            let parsed;
            try {
              parsed = JSON.parse(data);
            } catch (err) {
              continue;
            }
            if (parsed.error) continue;
            const choice = parsed.choices?.[0];
            const delta = choice?.delta?.content ?? choice?.message?.content ?? choice?.text;
            if (typeof delta === "string" && delta) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
          }
        }
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err) {
      /* client disconnected or provider aborted */
    } finally {
      try {
        await writer.close();
      } catch (err) {
        /* already closed */
      }
    }
  })();

  return new Response(readable, { headers });
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function storeImage(env, bytes) {
  if (!env.FILES) return null;
  const key = `images/${crypto.randomUUID()}.png`;
  await env.FILES.put(key, bytes, { httpMetadata: { contentType: "image/png" } });
  return `/api/images/${key.split("/").pop()}`;
}

async function handleImages(request, env) {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!canCall(env)) return json(503, { error: "no_key" });

  const imageModel = String(env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL).trim();
  if (!imageModel) return json(503, { error: "no_image_model" });

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return json(400, { error: "bad_request" });
  }
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim().slice(0, 4000) : "";
  if (!prompt) return json(400, { error: "bad_request" });

  const body = { model: imageModel, prompt, n: 1 };
  if (typeof payload.size === "string" && /^\d{3,4}x\d{3,4}$/.test(payload.size)) body.size = payload.size;

  let upstream;
  try {
    upstream = await fetch(apiUrl(env, "/images/generations"), {
      method: "POST",
      headers: upstreamHeaders(env, { "content-type": "application/json" }),
      body: JSON.stringify(body),
    });
  } catch (err) {
    return json(502, { error: "upstream_unreachable", detail: summarize(err.message) });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return providerError(upstream.status, text);
  }

  let data;
  try {
    data = await upstream.json();
  } catch (err) {
    return json(502, { error: "upstream_error", detail: "invalid_json" });
  }
  if (data?.error) return json(502, { error: "upstream_error", detail: summarize(JSON.stringify(data.error)) });

  const images = [];
  for (const entry of (Array.isArray(data?.data) ? data.data : []).slice(0, 4)) {
    if (!entry) continue;
    if (typeof entry.b64_json === "string" && entry.b64_json) {
      const stored = await storeImage(env, base64ToBytes(entry.b64_json)).catch(() => null);
      images.push(stored || `data:image/png;base64,${entry.b64_json}`);
    } else if (typeof entry.url === "string" && entry.url) {
      let stored = null;
      try {
        const download = await fetch(entry.url);
        if (download.ok) {
          const bytes = new Uint8Array(await download.arrayBuffer());
          stored = await storeImage(env, bytes);
        }
      } catch (err) {
        /* fall back to the remote URL */
      }
      images.push(stored || entry.url);
    }
  }

  if (!images.length) return json(502, { error: "image_error" });
  return json(200, { images });
}

async function handleImageFile(request, env, name) {
  if (!/^[a-f0-9-]{8,64}\.png$/i.test(name)) return json(404, { error: "not_found" });
  if (!env.FILES) return json(404, { error: "not_found" });
  const object = await env.FILES.get(`images/${name}`);
  if (!object) return json(404, { error: "not_found" });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

function handleConfig(env) {
  let host = "";
  try {
    host = new URL(providerBase(env)).host;
  } catch (err) {
    host = providerBase(env);
  }
  return json(200, {
    configured: canCall(env),
    model: String(env.OPENAI_MODEL || DEFAULT_MODEL).trim(),
    imageModel: String(env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL).trim() || null,
    provider: host,
    local: isLocalBase(env),
    runtime: "workers",
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/api/chat") return handleChat(request, env);
    if (pathname === "/api/images") return handleImages(request, env);
    if (pathname.startsWith("/api/images/")) {
      return handleImageFile(request, env, pathname.slice("/api/images/".length));
    }
    if (pathname === "/api/config") return handleConfig(env);
    if (pathname.startsWith("/api/")) return json(404, { error: "not_found" });

    if (pathname === "/auth/login" || pathname === "/auth/signup") {
      const rewritten = new URL("/auth.html", url);
      return env.ASSETS.fetch(new Request(rewritten.toString(), request));
    }

    return env.ASSETS.fetch(request);
  },
};
