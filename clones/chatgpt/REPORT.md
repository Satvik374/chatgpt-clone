# Replica report — ChatGPT web UI

## Scores (1440×900, threshold 24/255 per channel)

| Page | Match | Differing pixels | Closest details | Furthest details |
| --- | --- | --- | --- | --- |
| Logged-out home | **98.31%** | 1.69% | background `#fcfcfc`, composer 466,420,768×52, nav rows 36px | icon drawings, sidebar promo line breaks |
| Auth (`/auth/login`) | **99.24%** | 0.76% | column 528,132,384, email 432, Continue 508, type sizes | wordmark size, footer vertical rhythm |

Background sampled at (5,5) is `rgb(252,252,252)` on both reference and clone for both pages.

Diff images: `diffs/home.png`, `diffs/auth.png`; raw numbers in `diffs/report.json`.

## What matches exactly

- Page background, text colours, hairline weights and the 4px spacing base.
- The 260px sidebar, 36px nav rows, 20px icons at x16 and 14/20 labels.
- The 768×52 composer at x466 y420: radius 28, 10% border, layered 4% shadow, 44px buttons.
- The 384px auth column, 52px pill buttons, 56px email field and their exact vertical offsets
  (heading 132, social 188/252/316, email 432, Continue 508).
- Type: 24/28 heading, 30/36 auth heading, 14/20 nav, 12/16 legal, system UI stack.

## What is approximate

- **Icons and the brand mark** are original drawings matched for optical size and stroke weight. Shapes
  differ from the originals by design; nothing was traced or downloaded.
- **Sidebar promo wrapping** differs by one word (`max-width` chosen from the rendered line breaks).
- **Footer layout** matches the 12/16 muted line but not the original's inner inline grouping.
- **Fonts**: both use the machine's system UI font, so glyphs depend on the OS; sizes, weights and
  tracking are matched.
- **Voice button colour** (`#0b63d6`) is sampled from pixels, not a declared value.

## Authenticated surfaces (inferred, not captured)

Login is required, and the skill's rule is to stop at a login wall rather than bypass it. The
conversation view, search, images, plugins, settings and deep research therefore reuse the measured
tokens and known layout proportions; they are marked `inferred` in `DESIGN.md` and are not pixel-scored.

## Checks run

- Static pages served and loaded at 1440×900, 768×1024, 390×844; no horizontal scroll at any of them.
- Sign-in flow: email validation, email → password step, local session, redirect into the app, sign-out.
- Conversation: send → thread renders → streaming placeholder → no-key notice; history persists and
  appears in the sidebar; chat search finds it; delete removes it.
- Settings: tabs render; “Delete all chats” clears the store and returns to a new chat.
- Mobile drawer opens/closes with the scrim; Escape and scrim click close it.
- Console: no errors on the static pages. `/api/chat` logs a single 503 when no key is configured —
  that is the documented fallback, not a fault.

## Not verified

- **Real replies**: no `OPENAI_API_KEY` was available, so the streaming path was exercised only up to
  the 503 fallback. The proxy code is written for the OpenAI streaming API but has not been run against
  it here.
- **Real ChatGPT sign-in**: deliberately not attempted. The local session is a stand-in, not OAuth, and
  no credentials are collected.
- **Cross-browser**: Chromium only.

## Before public use

This is a study replica. The name “ChatGPT”, the wordmark and the design belong to OpenAI. Replace the
product name, all copy, the mark and the favicon before shipping anything public; the layout itself is
also their trade dress. The replica is not affiliated with or endorsed by OpenAI.
