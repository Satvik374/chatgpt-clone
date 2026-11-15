# ChatGPT front-end replica

A pixel-measured rebuild of ChatGPT's web UI, built for study. The interface was reconstructed by
observing the rendered public pages in a browser (computed styles, boxes, screenshots) — no HTML,
CSS, JavaScript, fonts or image files were taken from the original site. See
[clones/chatgpt/DESIGN.md](clones/chatgpt/DESIGN.md) and [clones/chatgpt/REPORT.md](clones/chatgpt/REPORT.md).

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

## Run

```bash
cp .env.example .env   # then set OPENAI_API_KEY (and a custom base URL if you need one)
node server.mjs
# http://localhost:3000
```

`server.mjs` serves the static files and proxies chat and image requests. Node 18+ is required
(uses global `fetch`).

## Provider configuration

Replies and image generation go through any **OpenAI-compatible** API. The endpoint is configured in
`.env` and may be a root base URL or a full endpoint:

```bash
OPENAI_API_KEY=sk-...
# a base URL …
OPENAI_BASE_URL=https://api.openai.com/v1
# … or a full endpoint
# OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions

OPENAI_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1   # leave empty to disable image generation
OPENAI_REQUIRE_KEY=true          # false for a keyless local server
PORT=3000
```

Works with OpenAI, OpenRouter, Groq, Together, Ollama (`http://127.0.0.1:11434/v1`), LM Studio
(`http://127.0.0.1:1234/v1`), vLLM and similar. The key stays on the server; the browser never sees it
and `.env` is git-ignored.

- `POST /api/chat` streams replies as server-sent events. It accepts `{ messages, system?, think? }`.
  Providers that ignore `stream` and answer with plain JSON are handled too.
- `POST /api/images` generates an image with `OPENAI_IMAGE_MODEL` and stores it under `data/images/`,
  returning a same-origin URL so generated images survive reloads.
- `GET /api/config` reports the configured model and provider without exposing the key.

## Pages and behaviour

| Route | Surface |
| --- | --- |
| `/` | Logged-out home: sidebar, centred composer, suggestion chip, legal footer |
| `/auth.html`, `/auth.html?mode=signup` | Sign-in / sign-up: social buttons, email step, password step |
| `/app.html#/` | Signed-in home: greeting, composer, suggestions, temporary chat |
| `/app.html#/c/<id>` | Conversation thread with streaming replies |
| `/app.html#/gpts` | Explore: search, category tabs, featured and trending GPTs |
| `/app.html#/gpts/finances`, `maps`, `images`, `canva` | Explore category pages |
| `/app.html#/my-gpts` | My GPTs, including a create flow |
| `/app.html#/library` | Library: upload, tabs, search, filter, preview, favorites, download |
| `/app.html#/scheduled` | Scheduled tasks: create, list, remove, filter |
| `/app.html#/plugins`, `/skills` | Plugins and skills: install/remove, details, collapse, search |
| `/app.html#/projects` | Projects: create a project and open its chats |
| `/app.html#/settings/account` | Settings shell with every sidebar section and editable values |
| `/app.html#/search` | Chat search overlay (also `Ctrl/Cmd+K`) |
| `/app.html#/images` | Generated image library |
| `/app.html#/research` | Deep research entry |

Every page, menu and button is wired: chats are stored per account, can be renamed, shared (link
copied), retried, rated, read aloud and deleted; composers attach text files, dictate through the
browser and toggle "Think" and spoken replies; library files can be uploaded, previewed, favorited,
downloaded and deleted; plugins, skills, projects, GPTs and scheduled tasks persist; settings values
are saved per account.

## Sign-in

Sign-in is **local to this browser**. The email `satvik.gamerz309@gmail.com` is prefilled in
`js/config.js`; any non-empty password completes the flow and creates a session in `localStorage`
(`cg.session`). Passwords are stored as a SHA-256 hash in `cg.accounts` — never sent anywhere, and no
OpenAI credentials are involved or accepted. Each account gets its own chats, images, library,
projects, plugins and settings. "Delete" on the Account settings page removes that account's local
data.

This is not a way to sign in to a real ChatGPT account: the replica has no server-side authentication
and deliberately does not collect or transmit passwords.

## Replies and images

The composer, threads, history and streaming UI all work with the configured provider. Image prompts
("Create an image of …", "Draw …") call `OPENAI_IMAGE_MODEL` and appear in the thread and in
`#/images`; if no image model is configured the request falls back to a text reply. When the server
has no key it still runs and shows an inline notice in the reply slot explaining how to enable
replies.

## Structure

```
index.html, auth.html, app.html   pages
css/                              tokens, base, home, auth, app, pages
js/                               content (all copy), icons (authored SVG), app, auth, pages
server.mjs                        static server + streaming chat and image proxy
assets/mark.svg                   authored brand mark / favicon
data/images/                      generated images (git-ignored)
clones/chatgpt/                   DESIGN.md, REPORT.md, reference captures, shots, diffs
```

All user-visible copy lives in `js/content.js`.

## Notice

This is a study replica of another product's interface. The ChatGPT name and the visual design belong
to OpenAI; the replica is not affiliated with or endorsed by them. Replace the brand name, copy and
marks before using it publicly. The logo-like mark and every icon here are original drawings, not the
originals.
