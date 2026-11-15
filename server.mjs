import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/* Load a local .env if present, without overriding real environment variables. */
try {
  const envFile = fs.readFileSync(path.join(root, ".env"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
} catch (err) {
  /* no .env file */
}

/* ------------------------------------------------------------------ provider */
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
const chatModel = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
const imageModel = (process.env.OPENAI_IMAGE_MODEL || "").trim();
const apiKey = (process.env.OPENAI_API_KEY || "").trim();
const requireKey = String(process.env.OPENAI_REQUIRE_KEY || "").trim().toLowerCase() !== "false";
const isLocalBase = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(baseUrl);
const canCall = Boolean(apiKey) || !requireKey || isLocalBase;

/* Accept either a base URL (https://host/v1) or a full endpoint (…/chat/completions). */
function apiUrl(suffix) {
  if (baseUrl.endsWith(suffix)) return baseUrl;
  const full = baseUrl.match(/\/(chat\/completions|images\/generations|completions|responses|audio\/speech)$/);
  if (full) return baseUrl.slice(0, -full[0].length) + suffix;
  return baseUrl + suffix;
}

function upstreamHeaders(extra = {}) {
  const headers = { ...extra };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  return headers;
}

const dataDir = path.join(root, "data", "images");

function ensureDataDir() {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    /* read-only filesystem: images still stream through the response */
  }
}

function saveImageBuffer(buffer) {
  try {
    ensureDataDir();
    const id = crypto.randomBytes(12).toString("hex");
    fs.writeFileSync(path.join(dataDir, `${id}.png`), buffer);
    return `/api/images/${id}.png`;
  } catch (err) {
    return null;
  }
}

/* --------------------------------------------------------------------- utils */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
};

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function summarize(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .slice(0, 400);
}

function providerError(status, body) {
  const error = status === 401 || status === 403 ? "unauthorized" : "upstream_error";
  return { error, status, detail: summarize(body) };
}

/* ---------------------------------------------------------------------- chat */
async function handleChat(req, res) {
  if (req.method !== "POST") {
    sendJSON(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (!canCall) {
    sendJSON(res, 503, { error: "no_key" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req, 4 * 1024 * 1024));
  } catch (err) {
    sendJSON(res, 400, { error: "bad_request" });
    return;
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

  if (!messages.length) {
    sendJSON(res, 400, { error: "bad_request" });
    return;
  }

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
  res.on("close", () => controller.abort());

  let upstream;
  try {
    upstream = await fetch(apiUrl("/chat/completions"), {
      method: "POST",
      headers: upstreamHeaders({ "content-type": "application/json", accept: "text/event-stream, application/json" }),
      body: JSON.stringify({ model: chatModel, messages: [...system, ...messages], stream: true }),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      res.end();
      return;
    }
    sendJSON(res, 502, { error: "upstream_unreachable", detail: summarize(err.message) });
    return;
  }

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => "");
    console.error(`[chat] provider responded ${upstream.status} from ${apiUrl("/chat/completions")}: ${summarize(body)}`);
    sendJSON(res, 502, providerError(upstream.status, body));
    return;
  }

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });

  const finish = (text) => {
    if (typeof text === "string" && text) res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  };

  const contentType = upstream.headers.get("content-type") || "";

  /* Some OpenAI-compatible servers ignore `stream` and answer with plain JSON. */
  if (!contentType.includes("text/event-stream")) {
    try {
      const data = await upstream.json();
      const text = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? "";
      finish(typeof text === "string" ? text : "");
    } catch (err) {
      console.error(`[chat] could not parse provider response: ${summarize(err.message)}`);
      finish("");
    }
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let wrote = 0;

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
          if (parsed.error) {
            console.error(`[chat] provider stream error: ${summarize(JSON.stringify(parsed.error))}`);
            continue;
          }
          const choice = parsed.choices?.[0];
          const delta = choice?.delta?.content ?? choice?.message?.content ?? choice?.text;
          if (typeof delta === "string" && delta) {
            wrote += delta.length;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
        }
      }
    }
    if (!wrote) console.error("[chat] provider sent no text content");
    res.write("data: [DONE]\n\n");
  } catch (err) {
    if (!controller.signal.aborted) console.error(`[chat] stream interrupted: ${summarize(err.message)}`);
  } finally {
    res.end();
  }
}

/* -------------------------------------------------------------------- images */
async function handleImages(req, res) {
  if (req.method !== "POST") {
    sendJSON(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (!canCall) {
    sendJSON(res, 503, { error: "no_key" });
    return;
  }
  if (!imageModel) {
    sendJSON(res, 503, { error: "no_image_model" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req, 256 * 1024));
  } catch (err) {
    sendJSON(res, 400, { error: "bad_request" });
    return;
  }

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim().slice(0, 4000) : "";
  if (!prompt) {
    sendJSON(res, 400, { error: "bad_request" });
    return;
  }

  const body = { model: imageModel, prompt, n: 1 };
  if (typeof payload.size === "string" && /^\d{3,4}x\d{3,4}$/.test(payload.size)) body.size = payload.size;

  let upstream;
  try {
    upstream = await fetch(apiUrl("/images/generations"), {
      method: "POST",
      headers: upstreamHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(body),
    });
  } catch (err) {
    sendJSON(res, 502, { error: "upstream_unreachable", detail: summarize(err.message) });
    return;
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    console.error(`[images] provider responded ${upstream.status}: ${summarize(text)}`);
    sendJSON(res, 502, providerError(upstream.status, text));
    return;
  }

  let data;
  try {
    data = await upstream.json();
  } catch (err) {
    sendJSON(res, 502, { error: "upstream_error", detail: "invalid_json" });
    return;
  }

  if (data?.error) {
    sendJSON(res, 502, { error: "upstream_error", detail: summarize(JSON.stringify(data.error)) });
    return;
  }

  const images = [];
  for (const entry of (Array.isArray(data?.data) ? data.data : []).slice(0, 4)) {
    if (!entry) continue;
    if (typeof entry.b64_json === "string" && entry.b64_json) {
      const saved = saveImageBuffer(Buffer.from(entry.b64_json, "base64"));
      if (saved) images.push(saved);
    } else if (typeof entry.url === "string" && entry.url) {
      /* Remote URLs from DALL·E expire, so mirror the bytes when possible. */
      let saved = null;
      try {
        const download = await fetch(entry.url);
        if (download.ok) saved = saveImageBuffer(Buffer.from(await download.arrayBuffer()));
      } catch (err) {
        /* fall back to the remote URL */
      }
      images.push(saved || entry.url);
    }
  }

  if (!images.length) {
    sendJSON(res, 502, { error: "image_error" });
    return;
  }

  sendJSON(res, 200, { images });
}

/* -------------------------------------------------------------------- config */
function handleConfig(req, res) {
  let host = "";
  try {
    host = new URL(baseUrl).host;
  } catch (err) {
    host = baseUrl;
  }
  sendJSON(res, 200, {
    configured: canCall,
    model: chatModel,
    imageModel: imageModel || null,
    provider: host,
    baseUrl,
    local: isLocalBase,
  });
}

function handleImageFile(req, res, name) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJSON(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (!/^[a-f0-9]{8,64}\.png$/.test(name)) {
    sendJSON(res, 404, { error: "not_found" });
    return;
  }
  const target = path.join(dataDir, name);
  fs.stat(target, (err, stats) => {
    if (err || !stats.isFile()) {
      sendJSON(res, 404, { error: "not_found" });
      return;
    }
    res.writeHead(200, { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" });
    if (req.method === "HEAD") res.end();
    else fs.createReadStream(target).pipe(res);
  });
}

/* -------------------------------------------------------------------- static */
function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/auth/login" || pathname === "/auth/signup") pathname = "/auth.html";

  const target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(target, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const type = TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    fs.createReadStream(target).pipe(res);
  });
}

/* -------------------------------------------------------------------- server */
const server = http.createServer((req, res) => {
  const pathname = req.url ? req.url.split("?")[0] : "";

  if (pathname === "/api/chat") {
    handleChat(req, res).catch(() => {
      if (!res.headersSent) sendJSON(res, 500, { error: "server_error" });
      else res.end();
    });
    return;
  }

  if (pathname === "/api/images") {
    handleImages(req, res).catch(() => {
      if (!res.headersSent) sendJSON(res, 500, { error: "server_error" });
      else res.end();
    });
    return;
  }

  if (pathname.startsWith("/api/images/")) {
    handleImageFile(req, res, pathname.slice("/api/images/".length));
    return;
  }

  if (pathname === "/api/config") {
    handleConfig(req, res);
    return;
  }

  if (pathname.startsWith("/api/")) {
    sendJSON(res, 404, { error: "not_found" });
    return;
  }

  serveStatic(req, res);
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, "0.0.0.0", () => {
  console.log(`ChatGPT replica running at http://localhost:${port}`);
  console.log(`Provider base URL: ${baseUrl}`);
  console.log(`Chat model: ${chatModel}${imageModel ? ` · image model: ${imageModel}` : " · image generation disabled (set OPENAI_IMAGE_MODEL)"}`);
  console.log(canCall ? "Replies enabled." : "Replies disabled: set OPENAI_API_KEY in .env (or OPENAI_REQUIRE_KEY=false for a keyless local server).");
});
