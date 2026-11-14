/* Chat UI, routing, local conversation store and streaming client for the replica. */
(function () {
  const C = window.CONTENT.app;
  const Session = window.Session;
  const session = Session.get();

  if (!session) {
    window.location.replace("auth.html");
    return;
  }

  const CHATS_KEY = "cg.chats";
  const state = {
    convId: null,
    model: C.models[0],
    settingsTab: 0,
    streaming: false,
    controller: null,
    draft: null,
  };

  const view = document.getElementById("view");
  const chatList = document.getElementById("chat-list");
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");

  /* ------------------------------------------------------------------ store */
  const Store = {
    all() {
      try {
        const raw = localStorage.getItem(CHATS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (err) {
        return [];
      }
    },
    write(list) {
      try {
        localStorage.setItem(CHATS_KEY, JSON.stringify(list));
      } catch (err) {
        /* storage may be unavailable */
      }
    },
    get(id) {
      return this.all().find((chat) => chat.id === id) || null;
    },
    create(title) {
      const now = Date.now();
      const chat = { id: uid(), title: title || C.empty.heading, messages: [], createdAt: now, updatedAt: now };
      const list = this.all();
      list.unshift(chat);
      this.write(list);
      return chat;
    },
    addMessage(id, message) {
      const list = this.all();
      const chat = list.find((item) => item.id === id);
      if (!chat) return;
      chat.messages.push(message);
      chat.updatedAt = Date.now();
      this.write(list);
    },
    rename(id, title) {
      const list = this.all();
      const chat = list.find((item) => item.id === id);
      if (!chat) return;
      chat.title = title;
      this.write(list);
    },
    remove(id) {
      this.write(this.all().filter((chat) => chat.id !== id));
    },
    clear() {
      this.write([]);
    },
  };

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `c${Date.now()}${Math.random().toString(16).slice(2)}`;
  }

  function seed() {
    if (localStorage.getItem(CHATS_KEY) !== null) return;
    const now = Date.now();
    Store.write([
      {
        id: uid(),
        title: C.seed.title,
        messages: [{ role: "assistant", content: C.seed.message, at: now }],
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  seed();

  /* ------------------------------------------------------------------ utils */
  const esc = (str) =>
    String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  function inlineMd(text) {
    let out = esc(text);
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return out.replace(/\n/g, "<br>");
  }

  function markdown(src) {
    if (!src) return "";
    const blocks = [];
    const text = src.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, (match, code) => {
      blocks.push(`<pre><code>${esc(code.replace(/\n$/, ""))}</code></pre>`);
      return `\n@@CODE${blocks.length - 1}@@\n`;
    });

    const out = [];
    let para = [];
    let list = null;

    const flushPara = () => {
      if (para.length) {
        out.push(`<p>${inlineMd(para.join("\n"))}</p>`);
        para = [];
      }
    };
    const flushList = () => {
      if (list) {
        out.push(`<${list.type}>${list.items.map((item) => `<li>${inlineMd(item)}</li>`).join("")}</${list.type}>`);
        list = null;
      }
    };

    text.split("\n").forEach((raw) => {
      const line = raw.replace(/\s+$/, "");
      const code = line.match(/^@@CODE(\d+)@@$/);
      if (code) {
        flushPara();
        flushList();
        out.push(blocks[Number(code[1])]);
        return;
      }
      if (!line.trim()) {
        flushPara();
        flushList();
        return;
      }
      const heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        flushPara();
        flushList();
        const level = Math.min(heading[1].length + 2, 6);
        out.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`);
        return;
      }
      const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
      const bullet = line.match(/^\s*[-*]\s+(.*)$/);
      if (ordered || bullet) {
        flushPara();
        const type = ordered ? "ol" : "ul";
        if (!list || list.type !== type) {
          flushList();
          list = { type, items: [] };
        }
        list.items.push((ordered || bullet)[1]);
        return;
      }
      if (/^>\s?/.test(line)) {
        flushPara();
        flushList();
        out.push(`<blockquote>${inlineMd(line.replace(/^>\s?/, ""))}</blockquote>`);
        return;
      }
      if (/^(-{3,}|\*{3,})$/.test(line)) {
        flushPara();
        flushList();
        out.push("<hr>");
        return;
      }
      flushList();
      para.push(line);
    });

    flushPara();
    flushList();
    return out.join("").replace(/@@CODE(\d+)@@/g, (match, index) => blocks[Number(index)]);
  }

  function titleFrom(text) {
    const cleaned = text.replace(/\s+/g, " ").trim();
    return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned || C.empty.heading;
  }

  function autosize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }

  function typingHTML() {
    return '<span class="typing" aria-label="Generating"><i></i><i></i><i></i></span>';
  }

  /* ---------------------------------------------------------------- chrome */
  C.nav.forEach((item) => {
    const link = document.createElement("a");
    link.className = "nav-item";
    link.href = item.href;
    link.dataset.icon = item.icon;
    link.append(item.label);
    document.getElementById("app-nav").append(link);
  });

  const modelMenu = document.getElementById("model-menu");
  C.models.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "model-option";
    button.setAttribute("role", "option");
    button.setAttribute("aria-checked", String(name === state.model));
    button.innerHTML = `<span>${esc(name)}</span><span class="check" data-icon="check"></span>`;
    button.addEventListener("click", () => {
      state.model = name;
      document.getElementById("model-label").textContent = name;
      modelMenu.querySelectorAll(".model-option").forEach((option) => {
        option.setAttribute("aria-checked", String(option === button));
      });
      closePopovers();
    });
    modelMenu.append(button);
  });

  document.getElementById("account-avatar").textContent = session.initials;
  document.getElementById("account-name").textContent = session.email;
  document.getElementById("account-email").textContent = session.email;
  document.getElementById("model-label").textContent = state.model;

  const accountBtn = document.getElementById("account-btn");
  const accountPopover = document.getElementById("account-popover");
  const modelBtn = document.getElementById("model-btn");

  function closePopovers() {
    accountPopover.hidden = true;
    modelMenu.hidden = true;
    accountBtn.setAttribute("aria-expanded", "false");
    modelBtn.setAttribute("aria-expanded", "false");
  }

  accountBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = accountPopover.hidden;
    closePopovers();
    if (open) {
      accountPopover.hidden = false;
      accountBtn.setAttribute("aria-expanded", "true");
    }
  });
  modelBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = modelMenu.hidden;
    closePopovers();
    if (open) {
      modelMenu.hidden = false;
      modelBtn.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("click", closePopovers);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePopovers();
      closeSidebar();
    }
  });

  accountPopover.querySelector('a[href="#/settings"]').addEventListener("click", closePopovers);
  document.getElementById("logout").addEventListener("click", () => {
    Session.clear();
    window.location.href = "index.html";
  });

  function openSidebar() {
    sidebar.classList.add("is-open");
    scrim.classList.add("is-open");
    scrim.setAttribute("aria-hidden", "false");
  }
  function closeSidebar() {
    sidebar.classList.remove("is-open");
    scrim.classList.remove("is-open");
    scrim.setAttribute("aria-hidden", "true");
  }
  document.getElementById("open-sidebar").addEventListener("click", openSidebar);
  scrim.addEventListener("click", closeSidebar);
  document.getElementById("brand-menu").addEventListener("click", () => {
    window.location.hash = "#/settings";
  });

  function renderChatList() {
    chatList.innerHTML = "";
    const chats = Store.all().sort((a, b) => b.updatedAt - a.updatedAt);
    if (!chats.length) {
      const empty = document.createElement("div");
      empty.className = "chats-empty";
      empty.textContent = "No chats yet";
      chatList.append(empty);
      return;
    }
    chats.forEach((chat) => {
      const row = document.createElement("div");
      row.className = `chat-item${chat.id === state.convId ? " is-active" : ""}`;
      const link = document.createElement("a");
      link.className = "chat-link";
      link.href = `#/c/${chat.id}`;
      link.textContent = chat.title;
      link.title = chat.title;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "chat-del";
      del.dataset.del = chat.id;
      del.dataset.icon = "trash";
      del.setAttribute("aria-label", C.deleteChat);
      row.append(link, del);
      chatList.append(row);
    });
    window.hydrateIcons(chatList);
  }

  chatList.addEventListener("click", (event) => {
    const del = event.target.closest("[data-del]");
    if (!del) return;
    event.preventDefault();
    const id = del.dataset.del;
    Store.remove(id);
    if (state.convId === id) {
      state.convId = null;
      window.location.hash = "#/";
    }
    renderChatList();
  });

  function highlightNav(hash) {
    document.querySelectorAll("#app-nav .nav-item").forEach((link) => {
      const href = link.getAttribute("href");
      const active = href === hash || (href !== "#/" && hash.startsWith(href.replace(/^#/, "")));
      link.classList.toggle("is-active", Boolean(active));
    });
  }

  /* -------------------------------------------------------------- composer */
  function composerHTML(kind) {
    const id = `prompt-${kind}`;
    const placeholder = kind === "empty" ? C.empty.placeholder : "Ask anything";
    const tail =
      kind === "empty"
        ? `<button class="composer-btn" type="button" aria-label="Dictate" data-icon="mic"></button>
           <button class="composer-voice" type="button" aria-label="Use voice mode" data-icon="wave"></button>`
        : `<button class="composer-btn" type="button" aria-label="Dictate" data-icon="mic"></button>
           <button class="send-btn" type="submit" aria-label="Send message" disabled data-icon="arrow-up"></button>`;
    return `<form class="composer" data-composer="${kind}" autocomplete="off">
      <button class="composer-btn" type="button" aria-label="Add files and more" data-icon="plus"></button>
      <label class="sr-only" for="${id}">Ask anything</label>
      <textarea id="${id}" rows="1" placeholder="${esc(placeholder)}"></textarea>
      ${tail}
    </form>`;
  }

  function bindComposer(root, kind) {
    const form = root.querySelector(`.composer[data-composer="${kind}"]`);
    if (!form) return;
    const textarea = form.querySelector("textarea");
    const send = form.querySelector(".send-btn");

    if (state.draft && kind === "empty") {
      textarea.value = state.draft;
      state.draft = null;
      if (send) send.disabled = false;
    }

    textarea.addEventListener("input", () => {
      autosize(textarea);
      if (send) send.disabled = !textarea.value.trim();
    });
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = textarea.value.trim();
      if (!text || state.streaming) return;
      textarea.value = "";
      autosize(textarea);
      if (send) send.disabled = true;
      sendMessage(text);
    });

    window.hydrateIcons(form);
    autosize(textarea);
    textarea.focus();
  }

  /* ---------------------------------------------------------------- router */
  function route() {
    const hash = window.location.hash || "#/";
    state.convId = hash.startsWith("#/c/") ? hash.slice(4) : null;
    document.title = "ChatGPT";
    closePopovers();

    if (hash.startsWith("#/c/")) {
      renderConversation(hash.slice(4));
    } else if (hash.startsWith("#/images")) {
      renderImages();
    } else if (hash.startsWith("#/plugins")) {
      renderPlugins();
    } else if (hash.startsWith("#/settings")) {
      renderSettings();
    } else if (hash.startsWith("#/search")) {
      renderSearch();
    } else if (hash.startsWith("#/research")) {
      renderResearch();
    } else {
      renderHome();
    }

    highlightNav(hash);
    renderChatList();
    closeSidebar();
  }

  window.addEventListener("hashchange", route);

  /* ------------------------------------------------------------------ views */
  function renderHome() {
    view.innerHTML = `<div class="center-view">
      <div class="center-inner">
        <h1>${esc(C.empty.heading)}</h1>
        ${composerHTML("empty")}
        <div class="suggestions">
          ${C.empty.suggestions
            .map((label) => `<button class="chip" type="button" data-suggest="${esc(label)}">${esc(label)}</button>`)
            .join("")}
        </div>
      </div>
    </div>`;
    bindComposer(view, "empty");
    view.querySelectorAll("[data-suggest]").forEach((chip) => {
      chip.addEventListener("click", () => sendMessage(chip.dataset.suggest));
    });
  }

  function renderResearch() {
    view.innerHTML = `<div class="center-view">
      <div class="center-inner">
        <h1>${esc(C.research.heading)}</h1>
        <p class="sub" style="margin-bottom:24px;font-size:14px;line-height:20px;color:var(--muted);text-align:center">${esc(
          C.research.subtitle
        )}</p>
        ${composerHTML("empty")}
      </div>
    </div>`;
    state.draft = C.research.prompt;
    bindComposer(view, "empty");
  }

  function messageHTML(message) {
    if (message.role === "user") {
      return `<article class="msg msg-user"><div class="bubble">${esc(message.content)}</div></article>`;
    }
    return `<article class="msg msg-assistant">
      <span class="msg-mark" data-mark></span>
      <div class="msg-body">
        <div class="prose">${markdown(message.content)}</div>
        <div class="msg-actions"${message.content ? "" : " hidden"}>
          <button type="button" data-action="copy" aria-label="${esc(C.copy)}" data-icon="copy"></button>
          <button type="button" data-action="up" aria-label="${esc(C.goodResponse)}" data-icon="thumb-up"></button>
          <button type="button" data-action="down" aria-label="${esc(C.badResponse)}" data-icon="thumb-down"></button>
        </div>
      </div>
    </article>`;
  }

  function renderConversation(id) {
    const chat = Store.get(id);
    if (!chat) {
      window.location.hash = "#/";
      return;
    }
    document.title = chat.title;
    view.innerHTML = `<div class="thread-scroll" id="thread-scroll">
        <div class="thread" id="thread">${chat.messages.map(messageHTML).join("")}</div>
      </div>
      <div class="composer-dock">
        ${composerHTML("thread")}
        <p class="composer-hint">${esc(C.composerHint)}</p>
      </div>`;
    window.hydrateIcons(view);
    bindComposer(view, "thread");
    bindMessageActions(view);
    scrollToBottom(true);
  }

  function renderImages() {
    view.innerHTML = `<div class="page"><div class="page-inner">
      <h1>${esc(C.images.title)}</h1>
      <p class="sub">${esc(C.images.subtitle)}</p>
      <div class="empty-state">
        <p>${esc(C.images.empty)}</p>
        <button class="btn btn-dark" type="button" id="create-image">${esc(C.images.cta)}</button>
      </div>
    </div></div>`;
    document.getElementById("create-image").addEventListener("click", () => {
      state.draft = C.images.prompt;
      window.location.hash = "#/";
    });
  }

  function renderPlugins() {
    view.innerHTML = `<div class="page"><div class="page-inner">
      <h1>${esc(C.plugins.title)}</h1>
      <p class="sub">${esc(C.plugins.subtitle)}</p>
      <div class="search-box">
        <span data-icon="search"></span>
        <label class="sr-only" for="plugin-search">${esc(C.plugins.searchPlaceholder)}</label>
        <input id="plugin-search" type="search" placeholder="${esc(C.plugins.searchPlaceholder)}" />
      </div>
      <div class="plugin-grid" id="plugin-grid"></div>
      <p class="sub" id="plugin-empty" hidden>${esc(C.plugins.empty)}</p>
    </div></div>`;
    window.hydrateIcons(view);

    const grid = document.getElementById("plugin-grid");
    const empty = document.getElementById("plugin-empty");
    const search = document.getElementById("plugin-search");

    const draw = (query) => {
      const q = query.trim().toLowerCase();
      const items = C.plugins.items.filter(
        (item) => !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
      );
      grid.innerHTML = items
        .map(
          (item) => `<div class="plugin-card">
            <span class="plugin-avatar">${esc(item.name.charAt(0))}</span>
            <div>
              <h3>${esc(item.name)}<span class="cat">${esc(item.category)}</span></h3>
              <p>${esc(item.desc)}</p>
            </div>
          </div>`
        )
        .join("");
      empty.hidden = items.length > 0;
    };

    search.addEventListener("input", () => draw(search.value));
    draw("");
  }

  function renderSearch() {
    view.innerHTML = `<div class="page"><div class="page-inner">
      <h1>${esc(C.search.title)}</h1>
      <div class="search-box">
        <span data-icon="search"></span>
        <label class="sr-only" for="chat-search">${esc(C.search.placeholder)}</label>
        <input id="chat-search" type="search" placeholder="${esc(C.search.placeholder)}" />
      </div>
      <div id="search-results"></div>
      <p class="sub" id="search-empty" hidden>${esc(C.search.empty)}</p>
    </div></div>`;
    window.hydrateIcons(view);

    const input = document.getElementById("chat-search");
    const results = document.getElementById("search-results");
    const empty = document.getElementById("search-empty");

    const draw = (query) => {
      const q = query.trim().toLowerCase();
      const chats = Store.all().sort((a, b) => b.updatedAt - a.updatedAt);
      const found = chats.filter((chat) => {
        if (!q) return true;
        if (chat.title.toLowerCase().includes(q)) return true;
        return chat.messages.some((message) => String(message.content).toLowerCase().includes(q));
      });
      results.innerHTML = found
        .slice(0, 20)
        .map((chat) => {
          const hit = chat.messages.find((message) => String(message.content).toLowerCase().includes(q));
          const body = hit ? String(hit.content).replace(/\s+/g, " ") : "";
          const preview = body.length > 90 ? `${body.slice(0, 90)}…` : body;
          return `<a class="result" href="#/c/${chat.id}"><strong>${esc(chat.title)}</strong><span>${esc(preview)}</span></a>`;
        })
        .join("");
      empty.hidden = found.length > 0;
    };

    input.addEventListener("input", () => draw(input.value));
    draw("");
    input.focus();
  }

  function renderSettings() {
    view.innerHTML = `<div class="page"><div class="page-inner">
      <h1>${esc(C.settings.title)}</h1>
      <div class="settings">
        <div class="settings-tabs" role="tablist" aria-label="${esc(C.settings.title)}">
          ${C.settings.tabs
            .map(
              (label, index) =>
                `<button type="button" role="tab" aria-selected="${index === state.settingsTab}" data-tab="${index}" class="${
                  index === state.settingsTab ? "is-active" : ""
                }">${esc(label)}</button>`
            )
            .join("")}
        </div>
        <div class="settings-panel" id="settings-panel"></div>
      </div>
    </div></div>`;

    const panel = document.getElementById("settings-panel");

    const draw = (index) => {
      state.settingsTab = index;
      view.querySelectorAll("[data-tab]").forEach((tab) => {
        const active = Number(tab.dataset.tab) === index;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });

      if (index === 0) {
        panel.innerHTML = `<h2>${esc(C.settings.general.account)}</h2>
          <div class="setting-row"><span>${esc(C.settings.general.email)}</span><span class="value">${esc(session.email)}</span></div>
          <div class="setting-row"><span>${esc(C.settings.general.plan)}</span><span class="value">${esc(
          C.settings.general.planValue
        )}</span></div>
          <div class="setting-row"><span>${esc(C.settings.general.language)}</span><span class="value">${esc(
          C.settings.general.languageValue
        )}</span></div>`;
      } else if (index === 1) {
        panel.innerHTML = `<h2>${esc(C.settings.data.title)}</h2>
          <p class="body">${esc(C.settings.data.body)}</p>
          <button class="danger" type="button" id="delete-all">${esc(C.settings.data.cta)}</button>`;
        document.getElementById("delete-all").addEventListener("click", () => {
          panel.innerHTML = `<h2>${esc(C.settings.data.confirm)}</h2>
            <p class="body">${esc(C.settings.data.confirmBody)}</p>
            <div class="confirm">
              <p>${esc(C.settings.data.confirm)}</p>
              <button class="danger" type="button" id="confirm-delete">${esc(C.settings.data.confirmCta)}</button>
              <button class="btn btn-outline" type="button" id="cancel-delete">${esc(C.settings.data.cancel)}</button>
            </div>`;
          document.getElementById("confirm-delete").addEventListener("click", () => {
            Store.clear();
            state.convId = null;
            renderChatList();
            window.location.hash = "#/";
          });
          document.getElementById("cancel-delete").addEventListener("click", () => draw(1));
        });
      } else {
        panel.innerHTML = `<h2>${esc(C.settings.about.title)}</h2>
          <p class="body">${esc(C.settings.about.body)}</p>
          <div class="setting-row"><span>${esc(C.settings.about.version)}</span><span class="value">${esc(
          C.settings.about.versionValue
        )}</span></div>`;
      }
    };

    view.querySelectorAll("[data-tab]").forEach((tab) => {
      tab.addEventListener("click", () => draw(Number(tab.dataset.tab)));
    });
    draw(state.settingsTab);
  }

  /* -------------------------------------------------------------- messaging */
  function scrollToBottom(force) {
    const box = document.getElementById("thread-scroll");
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  }

  function bindMessageActions(root) {
    root.querySelectorAll(".msg-actions").forEach((actions) => {
      actions.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const action = button.dataset.action;
        const message = button.closest(".msg");
        if (action === "copy") {
          const text = message.querySelector(".prose")?.innerText || "";
          try {
            await navigator.clipboard.writeText(text);
            button.classList.add("is-on");
            button.setAttribute("aria-label", C.copied);
            setTimeout(() => button.classList.remove("is-on"), 1200);
          } catch (err) {
            /* clipboard may be blocked */
          }
        } else {
          const group = button.parentElement;
          group.querySelectorAll("button").forEach((sibling) => {
            if (sibling !== button) sibling.classList.remove("is-on");
          });
          button.classList.toggle("is-on");
        }
      });
    });
  }

  function setStreaming(on) {
    state.streaming = on;
    const send = document.querySelector(".send-btn");
    if (!send) return;
    if (on) {
      send.innerHTML = window.icon("stop");
      send.classList.add("is-stop");
      send.disabled = false;
      send.setAttribute("aria-label", "Stop generating");
    } else {
      send.innerHTML = window.icon("arrow-up");
      send.classList.remove("is-stop");
      send.setAttribute("aria-label", "Send message");
      const textarea = document.querySelector(".composer textarea");
      send.disabled = !textarea || !textarea.value.trim();
    }
  }

  document.addEventListener("click", (event) => {
    const stop = event.target.closest(".send-btn.is-stop");
    if (!stop) return;
    event.preventDefault();
    if (state.controller) state.controller.abort();
  });

  async function streamReply(messages, onDelta) {
    const controller = new AbortController();
    state.controller = controller;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.error || "request_failed");
      error.code = data.error;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      parts.forEach((part) => {
        part.split("\n").forEach((line) => {
          if (!line.startsWith("data:")) return;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") return;
          try {
            const data = JSON.parse(payload);
            if (typeof data.delta === "string") onDelta(data.delta);
          } catch (err) {
            /* ignore keep-alives */
          }
        });
      });
    }
  }

  async function sendMessage(text) {
    if (state.streaming) return;

    let chat = state.convId ? Store.get(state.convId) : null;
    if (!chat) {
      chat = Store.create(titleFrom(text));
      state.convId = chat.id;
      history.replaceState(null, "", `#/c/${chat.id}`);
    }

    Store.addMessage(chat.id, { role: "user", content: text, at: Date.now() });

    renderConversation(chat.id);
    const thread = document.getElementById("thread");
    const node = document.createElement("article");
    node.className = "msg msg-assistant";
    node.innerHTML = `<span class="msg-mark" data-mark></span>
      <div class="msg-body">
        <div class="prose"></div>
        <div class="msg-actions" hidden>
          <button type="button" data-action="copy" aria-label="${esc(C.copy)}" data-icon="copy"></button>
          <button type="button" data-action="up" aria-label="${esc(C.goodResponse)}" data-icon="thumb-up"></button>
          <button type="button" data-action="down" aria-label="${esc(C.badResponse)}" data-icon="thumb-down"></button>
        </div>
      </div>`;
    thread.append(node);
    window.hydrateIcons(node);
    const prose = node.querySelector(".prose");
    prose.innerHTML = typingHTML();
    scrollToBottom();

    const apiMessages = chat.messages.map((message) => ({ role: message.role, content: message.content }));
    let answer = "";

    setStreaming(true);
    try {
      await streamReply(apiMessages, (delta) => {
        if (!answer) prose.innerHTML = "";
        answer += delta;
        prose.innerHTML = markdown(answer);
        scrollToBottom();
      });
      if (!answer.trim()) throw new Error("empty");
      Store.addMessage(chat.id, { role: "assistant", content: answer, at: Date.now() });
      node.querySelector(".msg-actions").hidden = false;
      bindMessageActions(node);
      renderChatList();
    } catch (err) {
      const aborted = err && err.name === "AbortError";
      if (answer.trim()) {
        Store.addMessage(chat.id, { role: "assistant", content: answer, at: Date.now() });
        node.querySelector(".msg-actions").hidden = false;
        bindMessageActions(node);
      }
      const notice = aborted ? C.noticeStopped : err.code === "no_key" ? C.noticeNoKey : C.noticeError;
      prose.innerHTML = answer.trim() ? markdown(answer) : "";
      prose.insertAdjacentHTML("beforeend", `<p class="notice">${inlineMd(notice)}</p>`);
      scrollToBottom();
      renderChatList();
    } finally {
      state.controller = null;
      setStreaming(false);
    }
  }

  window.hydrateIcons(document);
  route();

  // A prompt typed on the logged-out home page survives the sign-in step.
  try {
    const pending = localStorage.getItem("cg.pending");
    if (pending) {
      localStorage.removeItem("cg.pending");
      sendMessage(pending);
    }
  } catch (err) {
    /* storage is optional */
  }
})();
