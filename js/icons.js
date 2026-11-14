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
