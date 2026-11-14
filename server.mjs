import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/* Load a local .env if present, without overriding real environment variables. */
try {
  const envFile = fs.readFileSync(path.join(root, ".env"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
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

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
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

async function handleChat(req, res) {
  if (req.method !== "POST") {
    sendJSON(res, 405, { error: "method_not_allowed" });
    return;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJSON(res, 503, { error: "no_key" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
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
        .map((message) => ({ role: message.role, content: message.content.slice(0, 12000) }))
    : [];

  if (!messages.length) {
    sendJSON(res, 400, { error: "bad_request" });
    return;
  }

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        stream: true,
      }),
    });
  } catch (err) {
    sendJSON(res, 502, { error: "upstream_unreachable" });
    return;
  }

  if (!upstream.ok || !upstream.body) {
    sendJSON(res, 502, { error: "upstream_error", status: upstream.status });
    return;
  }

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              res.write(`data: ${JSON.stringify({ delta })}\n\n`);
            }
          } catch (err) {
            /* ignore malformed chunks */
          }
        }
      }
    }
    res.write("data: [DONE]\n\n");
  } catch (err) {
    /* client disconnected */
  } finally {
    res.end();
  }
}

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

const server = http.createServer((req, res) => {
  if (req.url && req.url.split("?")[0] === "/api/chat") {
    handleChat(req, res).catch(() => {
      if (!res.headersSent) sendJSON(res, 500, { error: "server_error" });
      else res.end();
    });
    return;
  }
  serveStatic(req, res);
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, "0.0.0.0", () => {
  console.log(`ChatGPT replica running at http://localhost:${port}`);
  console.log(process.env.OPENAI_API_KEY ? "Replies enabled (OPENAI_API_KEY found)." : "Replies disabled: no OPENAI_API_KEY.");
});
