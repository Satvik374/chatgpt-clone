/* All icons are authored here as plain geometry — none are copied from the reference site. */
(function () {
  const wrap = (body, sw) =>
    `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${
      sw || 1.6
    }" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

  const ICONS = {
    "new-chat": wrap(
      '<path d="M12 3H6.5A2.5 2.5 0 0 0 4 5.5v12A2.5 2.5 0 0 0 6.5 20h12a2.5 2.5 0 0 0 2.5-2.5V12"/><path d="M17.6 3.4a2 2 0 0 1 2.9 2.8l-7.9 7.9-3.6.8.8-3.6 7.8-7.9Z"/>'
    ),
    images: wrap(
      '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.6" cy="9.4" r="1.5"/><path d="m4 17 4.6-4.1a2 2 0 0 1 2.7.1L20 20"/>'
    ),
    plugins: wrap(
      '<path d="M8.5 3v3M15.5 3v3"/><path d="M6 6h12v3.5a6 6 0 0 1-12 0V6Z"/><path d="M12 15.5V21"/>'
    ),
    plans: wrap(
      '<circle cx="12" cy="12" r="9"/><path d="M14.6 9.3c-.5-.8-1.4-1.2-2.6-1.2-1.6 0-2.7.8-2.7 2 0 2.7 5.4 1.3 5.4 4.1 0 1.2-1.1 2.1-2.8 2.1-1.2 0-2.2-.5-2.7-1.3"/><path d="M12 6.3v11.4"/>'
    ),
    help: wrap(
      '<circle cx="12" cy="12" r="9"/><path d="M9.7 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1.1.9-1.1 1.7v.3"/><circle cx="12" cy="17.1" r=".7" fill="currentColor" stroke="none"/>'
    ),
    "deep-research": wrap(
      '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.2 4.2"/><path d="m18 4.2.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7Z"/>'
    ),
    settings: wrap(
      '<circle cx="12" cy="12" r="3"/><path d="M19.2 14.8a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5 2 2 0 1 1-4 0 1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1 2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5 2 2 0 1 1 4 0 1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1 2 2 0 1 1 0 4 1.6 1.6 0 0 0-1.5 1Z"/>'
    ),
    "chevron-down": wrap('<path d="m6 9.5 6 6 6-6"/>', 1.8),
    "external-link": wrap(
      '<path d="M14 4h6v6"/><path d="M20 4 10.5 13.5"/><path d="M18.5 14.5V18a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2H9"/>'
    ),
    panel: wrap('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>'),
    plus: wrap('<path d="M12 5v14M5 12h14"/>', 1.8),
    mic: wrap(
      '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>'
    ),
    wave: wrap('<path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/>', 1.8),
    "arrow-up": wrap('<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>', 1.9),
    search: wrap('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/>'),
    copy: wrap(
      '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15"/>'
    ),
    "thumb-up": wrap(
      '<path d="M7 10.5V20H4.5v-9.5H7Z"/><path d="M7 10.5 10.2 4a1.7 1.7 0 0 1 3.2.8V9h3.9a2 2 0 0 1 2 2.3l-.9 6.6a2 2 0 0 1-2 1.7H7"/>'
    ),
    "thumb-down": wrap(
      '<path d="M7 13.5V4H4.5v9.5H7Z"/><path d="M7 13.5 10.2 20a1.7 1.7 0 0 0 3.2-.8V15h3.9a2 2 0 0 0 2-2.3l-.9-6.6a2 2 0 0 0-2-1.7H7"/>'
    ),
    more: wrap(
      '<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>'
    ),
    trash: wrap(
      '<path d="M4 7h16M9.5 7V4.8h5V7"/><path d="M6.2 7 7.3 19.6A1.6 1.6 0 0 0 8.9 21h6.2a1.6 1.6 0 0 0 1.6-1.4L17.8 7"/>'
    ),
    close: wrap('<path d="m6 6 12 12M18 6 6 18"/>', 1.8),
    menu: wrap('<path d="M4 7h16M4 12h16M4 17h16"/>', 1.8),
    check: wrap('<path d="m5 12.5 4.5 4.5L19 6.5"/>', 1.9),
    apple: wrap(
      '<path d="M15.6 12.3c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.4 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2 2.5 1.9 1-.1 1.4-.7 2.6-.7s1.6.6 2.6.6c1.1 0 1.8-.9 2.5-1.9.5-.7.8-1.4 1-2-2-.8-2.1-3-2.1-3.2Z"/><path d="M13.9 6.3c.5-.6.9-1.4.8-2.3-.8.1-1.7.5-2.2 1.1-.5.5-.9 1.4-.8 2.2.9.1 1.8-.4 2.2-1Z"/>'
    ),
    phone: wrap(
      '<path d="M6.5 3.5h2.2l1.6 4-2 1.4a12.2 12.2 0 0 0 6.8 6.8l1.4-2 4 1.6v2.2a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z"/>'
    ),
    clock: wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    library: wrap(
      '<path d="M4 4.5h3v15H4zM9.5 4.5h3v15h-3z"/><path d="m15.6 5.1 2.9-.8 3.1 14.1-2.9.8z"/>'
    ),
    explore: wrap(
      '<circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>'
    ),
    pencil: wrap(
      '<path d="M4 20h4.2L19.4 8.8a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z"/><path d="m14.5 6.5 3 3"/>'
    ),
    globe: wrap(
      '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.2 2.3 3.3 5.2 3.3 8.5S14.2 18.2 12 20.5c-2.2-2.3-3.3-5.2-3.3-8.5S9.8 5.8 12 3.5Z"/>'
    ),
    temp: wrap('<circle cx="12" cy="12" r="8.3" stroke-dasharray="2.2 2.8"/>'),
    share: wrap('<path d="M12 15V3.5"/><path d="M8 7.2 12 3.2l4 4"/><path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6"/>'),
    think: wrap(
      '<circle cx="9" cy="12" r="4.6"/><circle cx="15" cy="12" r="4.6"/><circle cx="9" cy="12" r=".7" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r=".7" fill="currentColor" stroke="none"/>'
    ),
    sliders: wrap(
      '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'
    ),
    grid: wrap(
      '<rect x="4" y="4" width="6.5" height="6.5" rx="1.4"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4"/>'
    ),
    listw: wrap('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    lock: wrap('<rect x="5" y="10.5" width="14" height="9.5" rx="2.4"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/>'),
    filter: wrap('<path d="M4 5h16l-6.2 7.2V19l-3.6 1.8v-8.6L4 5Z"/>'),
    "arrow-left": wrap('<path d="M19 12H5M11 6l-6 6 6 6"/>', 1.8),
    "arrow-up-right": wrap('<path d="M7 17 17 7M9 7h8v8"/>', 1.8),
    download: wrap('<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/>'),
    volume: wrap('<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6"/><path d="M17.8 6.5a8 8 0 0 1 0 11"/>'),
    link: wrap('<path d="M10 14a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 1 0-5-5L11 8"/><path d="M14 10a3.5 3.5 0 0 0-5 0l-2.5 2.5a3.5 3.5 0 1 0 5 5L13 16"/>'),
    bell: wrap('<path d="M6.5 16V10a5.5 5.5 0 0 1 11 0v6l1.5 2H5l1.5-2Z"/><path d="M10 20.5h4"/>'),
    shield: wrap('<path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.2 7 8.8 4.2-1.6 7-4.6 7-8.8V6l-7-2.5Z"/><path d="M9.3 11.8 11.2 14l3.6-4"/>'),
    account: wrap('<circle cx="12" cy="9" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>'),
    parental: wrap('<circle cx="9" cy="9" r="2.8"/><circle cx="16.5" cy="10" r="2.2"/><path d="M3.8 19a5.2 5.2 0 0 1 10.4 0M14.5 19a4.2 4.2 0 0 1 6.2-3.6"/>'),
    contact: wrap('<circle cx="10" cy="9" r="3.2"/><path d="M4 19a6 6 0 0 1 11.2-3"/><path d="m15.5 18 1.8 1.8 3.4-3.6"/>'),
    usage: wrap('<path d="M4 16.5 8.5 11l3.5 3.5L20 6"/><path d="M15 6h5v5"/>'),
    billing: wrap('<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18M6.5 15h4"/>'),
    appearance: wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4"/>'),
    personalization: wrap('<path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"/><path d="m18.5 15 .8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"/>'),
    pets: wrap('<circle cx="7" cy="9" r="1.8"/><circle cx="12" cy="7.3" r="1.8"/><circle cx="17" cy="9" r="1.8"/><path d="M12 11.3c-2.6 0-4.7 2-4.7 4.1 0 1.4 1.1 2.3 2.5 2.3.9 0 1.5-.5 2.2-.5s1.3.5 2.2.5c1.4 0 2.5-.9 2.5-2.3 0-2.1-2.1-4.1-4.7-4.1Z"/>'),
    keyboard: wrap('<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M6.5 9.5h.01M9.5 9.5h.01M12.5 9.5h.01M15.5 9.5h.01M18 9.5h.01M7 13h10"/>'),
    archive: wrap('<rect x="3.5" y="5" width="17" height="4" rx="1.4"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M9.5 13h5"/>'),
    storage: wrap('<rect x="4" y="4" width="16" height="6" rx="2"/><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M7.5 7h.01M7.5 17h.01"/>'),
    controls: wrap('<rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="8" cy="12" r="2.2" fill="currentColor" stroke="none"/>'),
    integrations: wrap('<path d="M9 4.5h3.5a2 2 0 0 1 0 4H9v11H5.5a1 1 0 0 1-1-1V13H3a2 2 0 0 1 0-4h1.5V5.5a1 1 0 0 1 1-1H9Z"/><path d="M13 13.5h4v2h1.5a2 2 0 0 1 0 4H17v.5h-4v-6.5Z"/>'),
    passwords: wrap('<circle cx="8" cy="12" r="3.2"/><path d="M11.2 12h9M17 12v2.5M19.5 12v2"/>'),
    code: wrap('<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>'),
    "folder-plus": wrap('<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.2l2 2.3h7.8a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.5Z"/><path d="M12 11v6M9 14h6"/>'),
    "chevron-right": wrap('<path d="m9.5 6 6 6-6 6"/>', 1.8),
    file: wrap('<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14.5 3.5V8H19"/>'),
    "check-circle": wrap('<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.4 2.4 4.6-4.8"/>'),
    "arrow-down": wrap('<path d="M12 5v14M6 13l6 6 6-6"/>', 1.8),
    stop: wrap('<rect x="7" y="7" width="10" height="10" rx="1.6" fill="currentColor" stroke="none"/>'),
    info: wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r=".85" fill="currentColor" stroke="none"/>'),
  };

  /* A six-petal knot mark, drawn for this project (stands in for the OpenAI blossom). */
  const MARK = `<svg class="ico brand-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true" focusable="false"><g transform="translate(12 12)"><ellipse rx="3.2" ry="6.1" cy="-5.2"/><ellipse rx="3.2" ry="6.1" cy="-5.2" transform="rotate(60)"/><ellipse rx="3.2" ry="6.1" cy="-5.2" transform="rotate(120)"/><ellipse rx="3.2" ry="6.1" cy="-5.2" transform="rotate(180)"/><ellipse rx="3.2" ry="6.1" cy="-5.2" transform="rotate(240)"/><ellipse rx="3.2" ry="6.1" cy="-5.2" transform="rotate(300)"/></g></svg>`;

  function hydrate(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-icon]").forEach((el) => {
      if (el.dataset.iconDone) return;
      const svg = ICONS[el.dataset.icon];
      if (!svg) return;
      el.insertAdjacentHTML("afterbegin", svg);
      el.dataset.iconDone = "1";
    });
    scope.querySelectorAll("[data-mark]").forEach((el) => {
      if (el.dataset.markDone) return;
      el.insertAdjacentHTML("afterbegin", MARK);
      el.dataset.markDone = "1";
    });
  }

  window.ICONS = ICONS;
  window.MARK = MARK;
  window.icon = (name) => ICONS[name] || "";
  window.hydrateIcons = hydrate;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => hydrate());
  } else {
    hydrate();
  }
})();
