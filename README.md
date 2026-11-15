# ChatGPT front-end replica

A pixel-measured rebuild of ChatGPT's web UI, built for study. The interface was reconstructed by
observing the rendered public pages in a browser (computed styles, boxes, screenshots) — no HTML,
CSS, JavaScript, fonts or image files were taken from the original site. See
[clones/chatgpt/DESIGN.md](clones/chatgpt/DESIGN.md) and [clones/chatgpt/REPORT.md](clones/chatgpt/REPORT.md).

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

## Run

```bash
node server.mjs
# http://localhost:3000
```

`server.mjs` serves the static files and proxies chat requests. Node 18+ is required (uses global `fetch`).

## Pages

| Route | Surface |
| --- | --- |
| `/` | Logged-out home: sidebar, centred composer, suggestion chip, legal footer |
| `/auth.html`, `/auth.html?mode=signup` | Sign-in / sign-up: social buttons, email step, password step |
| `/app.html#/` | Signed-in home: personalized greeting, composer, suggestion list, temporary chat |
| `/app.html#/c/<id>` | Conversation thread with streaming replies |
| `/app.html#/gpts` | Explore: GPT notice, search, category tabs, featured and trending sections |
| `/app.html#/gpts/finances`, `maps`, `images`, `canva` | Explore category pages |
| `/app.html#/my-gpts` | My GPTs, with create entry |
| `/app.html#/library` | Library: tabs, search, file grid |
| `/app.html#/scheduled` | Scheduled tasks and recommended prompts |
| `/app.html#/plugins` | Plugins directory (Skills tab switches to the Skills view) |
| `/app.html#/projects` | Projects table |
| `/app.html#/settings/account` | Settings shell with account details and every sidebar section |
| `/app.html#/search` | Chat search overlay (also `Ctrl/Cmd+K` and the sidebar search icon) |
| `/app.html#/images` | Image library (empty state) |
| `/app.html#/research` | Deep research entry |

## Sign-in

Sign-in is **local to the browser**. The email `satvik.gamerz309@gmail.com` is prefilled in
`js/config.js`; any non-empty password completes the flow and creates a session in `localStorage`
(`cg.session`). Nothing is sent anywhere, and no OpenAI credentials are involved or accepted.

This is not a way to sign into a real ChatGPT account: the replica has no backend authentication and
deliberately does not collect or transmit passwords.

## Replies

The composer, threads, history and streaming UI all work. Actual model replies need an OpenAI key,
read server-side:

```bash
cp .env.example .env   # then set OPENAI_API_KEY
node server.mjs
```

Without a key the app still runs and shows an inline notice in the reply slot explaining how to enable
them. The key never reaches the browser, and `.env` is git-ignored.

## Structure

```
index.html, auth.html, app.html   pages
css/                              tokens, base, home, auth, app, pages
js/                               content (all copy), icons (authored SVG), app, auth, pages
server.mjs                        static server + streaming chat proxy
assets/mark.svg                   authored brand mark / favicon
clones/chatgpt/                   DESIGN.md, REPORT.md, reference captures, shots, diffs
```

All user-visible copy lives in `js/content.js`.

## Notice

This is a study replica of another product's interface. The ChatGPT name and the visual design belong
to OpenAI; the replica is not affiliated with or endorsed by them. Replace the brand name, copy and
marks before using it publicly. The logo-like mark and every icon here are original drawings, not the
originals.
