# Build spec — ChatGPT web UI (logged-out home + auth)

Source of truth: rendered pages observed in a Chromium browser at **1440×900** (secondary checks
768×1024, 390×844). Every value marked `measured` comes from `reference/*.json`; `inferred` values are
judgement for surfaces that require an account.

Public URLs observed: `https://chatgpt.com/`, `https://chatgpt.com/auth/login`.
No markup, stylesheets, scripts, fonts or image bytes were collected — only computed styles, boxes and
screenshots.

## Surfaces

| Surface | Value | Area | Notes |
| --- | --- | --- | --- |
| Page background | `#fcfcfc` | whole viewport | measured on body and html |
| Sidebar | `#fcfcfc` | 260 × viewport | same paint as page, separated by a 7% black hairline (inferred from the rendered edge) |
| Composer | `#ffffff` | 768 × 52 | 1px `rgba(0,0,0,.1)` border, radius 28 |
| Chip / outline button | `#ffffff` | — | 1px `rgba(0,0,0,.2)` border |
| Primary button | `#0d0d0d` | 44 tall | white text, pill |
| Soft button (sidebar promo) | `#f3f3f3` | 220 × 44 | 14/500 |
| Auth input | transparent | 384 × 56 | 1px `rgba(0,0,0,.15)`, radius 999 |
| Voice circle | measured element is 44px; painted circle ≈32px | — | blue `#0b63d6` (inferred from pixels) |

Text: `#0d0d0d`; secondary `#5d5d5d`.

## Type

System stack — the reference renders with the OS UI font (`-apple-system-body, ui-sans-serif, …`). No
webfont is loaded or substituted.

| Role | Size / line | Weight | Tracking | Where |
| --- | --- | --- | --- | --- |
| Home heading | 24 / 28 | 400 | `0.07px` | “Where should we begin?” |
| Auth heading | 30 / 36 | 400 | normal | “Log in or sign up” |
| Brand wordmark | 16 / 32 | 650 | `-0.38px` | sidebar top |
| Nav item | 14 / 20 | 400 | `-0.15px` | sidebar rows |
| Pill button | 14 / 20 | 600 | `-0.08px` | Log in, Sign up, chips |
| Auth button | 16 / 24 | 500 | normal | social buttons, Continue |
| Composer input | 17 / 24 | 400 | normal | desktop textarea |
| Promo title | 17 / 24 | 700 | normal | sidebar card |
| Micro / legal | 12 / 16 | 400 | normal | promo body, footer, auth legal |

## Geometry — home (1440×900)

| Element | Box (x, y, w, h) | Detail |
| --- | --- | --- |
| Sidebar | 0, 0, 260, 900 | inner gutter 6px |
| Brand row | text 18, 10, 62, 32 | row height 60 |
| Nav list | 6, 60, 247, 252 | rows 36 tall, radius 10, padding 8/10, icon 20 at x16, text x48 |
| Topbar | 0, 0, 1440, 61 | actions right-aligned, 16px inset |
| Log in pill | 1229, 9, 63, 44 | radius 999 |
| Sign up pill | 1300, 9, 124, 44 | 8px gap |
| Heading | 719, 358, 263, 32 | centre 850.5 = main centre |
| Composer | 466, 420, 768, 52 | centre column 768 |
| Plus button | 473, 424, 44, 44 | 6px gap to field |
| Textarea | 523, 434, 618, 24 | placeholder “Ask ChatGPT” |
| Mic / voice | 1141 / 1185, 424, 44, 44 | — |
| Chip | 779, 484, 143, 44 | 12px below composer |
| Footer | 260, 876, 1180, 24 | 12/16 centred, `#5d5d5d` |
| Promo title | 20, 592, 220, 48 | 700, wraps to two lines |
| Promo CTA | 20, 836, 220, 44 | `#f3f3f3` |

Spacing base is 4px; repeating gaps: 4, 6, 8, 12, 16, 20, 30.

## Geometry — auth (1440×900)

| Element | Box | Detail |
| --- | --- | --- |
| Wordmark | 32, 24, 104, 28 | 20/28 600 (inferred size from pixels) |
| Column | 528, 132, 384, 428 | heading → Continue |
| Heading | 528, 132, 384, 36 | — |
| Social buttons | 528, 188 / 252 / 316, 384, 52 | 12px gaps |
| Divider | y 400 | 16px above/below the email form |
| Email input | 528, 432, 384, 56 | — |
| Continue | 528, 508, 384, 52 | `#0d0d0d` |
| Footer mark | ~708, 760, 24, 24 | authored mark |
| Legal links | y ~810 | 12/16, underlined |
| Cookie preferences | y ~852 | 12/16 |

## Responsive

| Viewport | Behaviour |
| --- | --- |
| ≥ 901 | sidebar fixed 260, content 768 |
| 481–900 | sidebar off-canvas (300 drawer), hamburger in topbar, composer inset 24, height 48 |
| ≤ 480 | sidebar off-canvas, composer inset 12, height 48, only “Log in” in the topbar |
| mobile | heading copy switches to “What are you working on?” (measured) |

## Components and states

- **Nav row** — default transparent; hover `rgba(0,0,0,.05)`; active 8% fill; 120ms background.
- **Pill buttons** — dark `#0d0d0d` → `#2d2d2d` on hover; outline white → `#f3f3f3`; no shadow.
- **Composer** — white, 1px 10% border, radius 28, layered 4% shadow; focus ring not drawn on the
  container (the reference keeps the border), caret in the field.
- **Chip** — pill, 20% border, 14/600; hover `#f3f3f3`.
- **Auth button** — transparent, 10% border, 16/500; hover fill `#f3f3f3`.
- **Auth input** — 15% border; focus border `#0d0d0d` + 1px ring; placeholder `#8f8f8f`.
- **Textarea** — auto-grows to 200px, Enter sends, Shift+Enter newline.
- Focus is always visible (`:focus-visible` outline) even where the reference is weaker.

## App surfaces (inferred)

The conversation UI, search, images, plugins, settings and deep research sit behind authentication, so
they are not captured. They reuse the measured tokens above:

- Sidebar keeps 260px, 36px rows, 10px radius, 14/20 `-0.15px`.
- Conversation column 768px centred, 16/28 prose, user bubble `#f3f3f3` radius 24 max-width 72%.
- Assistant messages are plain text beside a 26px mark, with copy/thumbs actions in 16px muted icons.
- Composer dock reuses the measured composer, with a 12/16 disclaimer line beneath.
- Header model switcher 18/26 500 with a 16px chevron, 60px tall.

## Assets

| Original | Replacement | How |
| --- | --- | --- |
| OpenAI blossom wordmark mark | Six-petal knot | Authored SVG ellipses, stroke 1.4 |
| Product icons (new chat, images, plugins, plans, help, research, settings, mic, waveform…) | 24px line icons | Authored geometry, stroke 1.6–1.9, 20px optical size |
| Google / Apple marks | “G” letter mark + apple outline | Authored, not traced |
| Photography / illustrations | none | The captured pages use none |

## Anti-patterns

- If a card has a drop shadow or a 16px card radius on the home page, it is wrong — surfaces are flat
  with 10% hairlines.
- If the composer is not 28px radius on desktop, it is wrong.
- If body text is not the system UI font, it is wrong — no webfont is used.
- If the page background is pure white or `#f9f9f9`, it is wrong — it is `#fcfcfc`.
- If nav rows are taller than 36px or use 16px labels, it is wrong.
- If the home hero is not a single centred column of 768px, it is wrong.
- If any preview copy is centred body text, it is wrong — only headings and the legal line centre.

## Acceptance checklist

- [x] Page background exactly `#fcfcfc` on both captured pages.
- [x] Home heading box 719, 358 and composer 466, 420, 768×52.
- [x] Auth column 528, 132, 384; email 432; Continue 508.
- [x] 1440 diff ≥ 90% on both pages (98.31 / 99.24).
- [x] No horizontal scroll at 1440, 768, 390.
- [x] Sidebar becomes a drawer below 901; hamburger appears.
- [x] All copy in `js/content.js`; no copied markup, CSS, fonts or images.
- [x] Keyboard: tab through nav, composer, auth form; visible focus.
- [x] No console errors on static pages (the 503 from `/api/chat` without a key is intentional).
