/* Signed-in ChatGPT replica: navigation, page renderers, local conversation store and streaming client. */
(function () {
  const A = window.CONTENT.app;
  const Session = window.Session;
  const session = Session.get();

  if (!session) {
    window.location.replace("auth.html");
    return;
  }

  const CHATS_KEY = "cg.chats";
  const state = {
    convId: null,
    settingsSection: "Account",
    streaming: false,
    controller: null,
    draft: null,
    temp: false,
  };

  const app = document.getElementById("app");
  const view = document.getElementById("view");
  const chatList = document.getElementById("chat-list");
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");
  const searchModal = document.getElementById("search-modal");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");

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
      const chat = { id: uid(), title: title || "New chat", messages: [], createdAt: now, updatedAt: now };
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
    Store.write(
      A.seed.titles.map((title, index) => ({
        id: uid(),
        title,
        messages: [{ role: "assistant", content: A.seed.message, at: now - index * 60000 }],
        createdAt: now - index * 60000,
        updatedAt: now - index * 60000,
      }))
    );
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
    return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned || "New chat";
  }

  function autosize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }

  function typingHTML() {
    return '<span class="typing" aria-label="Generating"><i></i><i></i><i></i></span>';
  }

  function tile(item, size) {
    return `<span class="app-tile ${size || ""} tone-${esc(item.tone || "plain")}"><span>${esc(item.mark || item.name.charAt(0))}</span></span>`;
  }

  function slug(label) {
    return String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /* ---------------------------------------------------------------- chrome */
  const nav = document.getElementById("app-nav");
  A.nav.forEach((item) => {
    const wrap = document.createElement("div");
    wrap.className = "nav-wrap";
    const link = document.createElement("a");
    link.className = "nav-item";
    link.href = item.href;
    link.dataset.icon = item.icon;
    link.append(item.label);
    if (item.explore) {
      link.dataset.explore = "1";
      const chev = document.createElement("span");
      chev.className = "nav-chev";
      chev.dataset.icon = "chevron-right";
      link.append(chev);
      const menu = document.createElement("div");
      menu.className = "explore-menu";
      menu.hidden = true;
      [
        { label: "Finances", href: "#/gpts/finances" },
        { label: "Maps", href: "#/gpts/maps" },
        { label: "Images", href: "#/gpts/images" },
        { label: "GPTs", href: "#/gpts" },
        { label: "Canva", href: "#/gpts/canva" },
      ].forEach((entry) => {
        const a = document.createElement("a");
        a.href = entry.href;
        a.textContent = entry.label;
        menu.append(a);
      });
      wrap.append(link, menu);
    } else {
      wrap.append(link);
    }
    nav.append(wrap);
  });

  const exploreMenu = nav.querySelector(".explore-menu");
  nav.addEventListener("click", (event) => {
    const explore = event.target.closest("[data-explore]");
    if (explore && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      const opening = exploreMenu.hidden;
      closePopovers();
      exploreMenu.hidden = !opening;
      if (opening) {
        exploreMenu.style.top = `${explore.offsetTop + explore.offsetHeight + 2}px`;
      }
      return;
    }
    closePopovers();
  });

  const accountBtn = document.getElementById("account-btn");
  const accountPopover = document.getElementById("account-popover");

  function closePopovers() {
    accountPopover.hidden = true;
    accountBtn.setAttribute("aria-expanded", "false");
    if (exploreMenu) exploreMenu.hidden = true;
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
  document.addEventListener("click", (event) => {
    if (event.target.closest(".explore-menu")) return;
    closePopovers();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePopovers();
      closeSearch();
      closeSidebar();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
    }
  });

  document.getElementById("brand-menu").addEventListener("click", (event) => {
    event.stopPropagation();
    accountBtn.click();
  });
  document.getElementById("logout").addEventListener("click", () => {
    Session.clear();
    window.location.href = "index.html";
  });

  document.getElementById("account-avatar").textContent = A.profile.initials;
  document.getElementById("account-name").textContent = A.profile.name;
  document.getElementById("account-plan").textContent = A.profile.plan;
  document.getElementById("account-email").textContent = session.email;

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
  document.getElementById("sidebar-reopen").addEventListener("click", () => {
    app.classList.remove("sidebar-collapsed");
  });
  document.getElementById("sb-collapse").addEventListener("click", () => {
    if (window.innerWidth <= 900) closeSidebar();
    else app.classList.add("sidebar-collapsed");
  });

  /* -------------------------------------------------------------- chat list */
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
      del.setAttribute("aria-label", A.deleteChat);
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
      let active = href === hash;
      if (href === "#/gpts" && hash.startsWith("#/gpts")) active = true;
      if (href !== "#/" && hash.startsWith(href)) active = true;
      link.classList.toggle("is-active", Boolean(active));
    });
    const newRow = document.getElementById("new-chat-row");
    newRow.classList.toggle("is-active", hash === "#/" || hash === "");
  }

  /* ---------------------------------------------------------------- search */
  function openSearch() {
    searchModal.hidden = false;
    searchInput.value = "";
    drawSearch("");
    window.hydrateIcons(searchModal);
    setTimeout(() => searchInput.focus(), 20);
  }
  function closeSearch() {
    searchModal.hidden = true;
  }
  function drawSearch(query) {
    const q = query.trim().toLowerCase();
    const chats = Store.all()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((chat) => {
        if (!q) return true;
        if (chat.title.toLowerCase().includes(q)) return true;
        return chat.messages.some((message) => String(message.content).toLowerCase().includes(q));
      })
      .slice(0, 12);

    if (!chats.length) {
      searchResults.innerHTML = `<p class="search-empty">${esc(A.search.empty)}</p>`;
      return;
    }
    searchResults.innerHTML = `<p class="search-group">Chats</p>${chats
      .map((chat) => {
        const hit = q
          ? chat.messages.find((message) => String(message.content).toLowerCase().includes(q))
          : chat.messages[0];
        const body = hit ? String(hit.content).replace(/\s+/g, " ") : "";
        const preview = body.length > 84 ? `${body.slice(0, 84)}…` : body;
        return `<a class="search-result" href="#/c/${chat.id}"><span class="sr-icon" data-icon="new-chat"></span><span class="sr-text"><strong>${esc(
          chat.title
        )}</strong><span>${esc(preview)}</span></span></a>`;
      })
      .join("")}`;
    window.hydrateIcons(searchResults);
  }
  searchInput.addEventListener("input", () => drawSearch(searchInput.value));
  document.getElementById("search-scrim").addEventListener("click", closeSearch);
  searchResults.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeSearch();
  });
  document.getElementById("sb-search").addEventListener("click", openSearch);

  /* -------------------------------------------------------------- composer */
  function composerHTML(kind, placeholder) {
    const id = `prompt-${kind}`;
    const think =
      kind === "scheduled"
        ? ""
        : `<button class="think-btn" type="button"><span data-icon="think"></span><span>${esc(A.home.think)}</span></button>`;
    const tail =
      kind === "home"
        ? `<button class="composer-btn" type="button" aria-label="Dictate" data-icon="mic"></button>
           <button class="composer-voice" type="button" aria-label="Use voice mode" data-icon="wave"></button>`
        : `<button class="composer-btn" type="button" aria-label="Dictate" data-icon="mic"></button>
           <button class="send-btn blue" type="submit" aria-label="Send message" data-icon="arrow-up"></button>`;
    return `<form class="composer${kind === "home" ? " home-composer" : ""}" data-composer="${kind}" autocomplete="off">
      <button class="composer-btn" type="button" aria-label="Add files and more" data-icon="plus"></button>
      <label class="sr-only" for="${id}">${esc(placeholder)}</label>
      <textarea id="${id}" rows="1" placeholder="${esc(placeholder)}"></textarea>
      ${kind === "scheduled" ? "" : think}
      ${tail}
    </form>`;
  }

  function bindComposer(root, kind) {
    const form = root.querySelector(`.composer[data-composer="${kind}"]`);
    if (!form) return;
    const textarea = form.querySelector("textarea");
    const send = form.querySelector(".send-btn");

    if (state.draft) {
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

    const voice = form.querySelector(".composer-voice");
    if (voice) {
      voice.addEventListener("click", () => {
        textarea.focus();
      });
    }
    const think = form.querySelector(".think-btn");
    if (think) {
      think.addEventListener("click", () => {
        think.classList.toggle("is-on");
        textarea.focus();
      });
    }

    window.hydrateIcons(form);
    autosize(textarea);
    if (kind === "home") setTimeout(() => textarea.focus(), 20);
  }

  /* ---------------------------------------------------------------- router */
  function route() {
    const hash = window.location.hash || "#/";
    state.convId = hash.startsWith("#/c/") ? hash.slice(4) : null;
    document.title = "ChatGPT";
    closePopovers();
    closeSearch();
    closeSidebar();

    const settingsMode = hash.startsWith("#/settings");
    app.classList.toggle("settings-mode", settingsMode);

    if (hash.startsWith("#/c/")) {
      renderConversation(hash.slice(4));
    } else if (hash.startsWith("#/gpts")) {
      const category = hash.split("/")[2] || "gpts";
      renderExplore(category);
    } else if (hash.startsWith("#/my-gpts")) {
      renderMyGpts();
    } else if (hash.startsWith("#/library")) {
      renderLibrary();
    } else if (hash.startsWith("#/scheduled")) {
      renderScheduled();
    } else if (hash.startsWith("#/plugins")) {
      renderPlugins();
    } else if (hash.startsWith("#/projects")) {
      renderProjects();
    } else if (hash.startsWith("#/settings")) {
      const requested = hash.split("/")[2];
      if (requested) {
        const found = A.settings.nav.flatMap((group) => group.items).find((item) => slug(item.label) === requested);
        if (found) state.settingsSection = found.label;
      }
      renderSettings();
    } else if (hash.startsWith("#/images")) {
      renderImages();
    } else if (hash.startsWith("#/research")) {
      renderResearch();
    } else if (hash.startsWith("#/search")) {
      renderHome();
      openSearch();
    } else if (hash.startsWith("#/temporary")) {
      state.temp = true;
      renderHome(true);
    } else {
      renderHome();
    }

    highlightNav(hash);
    renderChatList();
  }

  window.addEventListener("hashchange", route);

  /* ------------------------------------------------------------------ views */
  function renderHome(showTemp) {
    view.innerHTML = `<div class="signed-home">
      <button class="temp-chat" type="button" aria-label="${esc(A.home.temporaryChat)}" data-icon="temp"></button>
      <div class="signed-center">
        ${showTemp ? `<div class="temp-note"><span data-icon="temp"></span>Temporary chat — this conversation won’t appear in history.</div>` : ""}
        <h1>${esc(A.home.greeting)}</h1>
        ${composerHTML("home", A.home.placeholder)}
        <div class="quick-list">
          ${A.home.suggestions
            .map(
              (item) =>
                `<button class="quick" type="button" data-suggest="${esc(item.label)}"><span class="quick-ico" data-icon="${esc(
                  item.icon
                )}"></span><span>${esc(item.label)}</span></button>`
            )
            .join("")}
        </div>
      </div>
    </div>`;
    window.hydrateIcons(view);
    bindComposer(view, "home");
    view.querySelectorAll("[data-suggest]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const textarea = view.querySelector("textarea");
        textarea.value = chip.dataset.suggest;
        autosize(textarea);
        textarea.focus();
      });
    });
    view.querySelector(".temp-chat").addEventListener("click", () => {
      state.temp = true;
      renderHome(true);
    });
  }

  function messageHTML(message) {
    if (message.role === "user") {
      return `<article class="msg msg-user"><div class="bubble">${esc(message.content)}</div></article>`;
    }
    return `<article class="msg msg-assistant">
      <div class="msg-body">
        <div class="prose">${markdown(message.content)}</div>
        <div class="msg-actions"${message.content ? "" : " hidden"}>
          <button type="button" data-action="copy" aria-label="${esc(A.copy)}" data-icon="copy"></button>
          <button type="button" data-action="up" aria-label="${esc(A.goodResponse)}" data-icon="thumb-up"></button>
          <button type="button" data-action="down" aria-label="${esc(A.badResponse)}" data-icon="thumb-down"></button>
          <button type="button" data-action="speak" aria-label="Read aloud" data-icon="volume"></button>
          <button type="button" data-action="share" aria-label="Share" data-icon="share"></button>
          <button type="button" data-action="more" aria-label="More" data-icon="more"></button>
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
    view.innerHTML = `<div class="chat-view">
      <header class="chat-top">
        <button class="chat-title" type="button">${esc(chat.title)}<span data-icon="chevron-down"></span></button>
        <button class="chat-icon" type="button" aria-label="Share chat" data-icon="share"></button>
      </header>
      <div class="thread-scroll" id="thread-scroll">
        <div class="thread" id="thread">${chat.messages.map(messageHTML).join("")}</div>
      </div>
      <div class="composer-dock">
        <p class="composer-hint">${esc(A.composerHint)}</p>
        ${composerHTML("thread", A.home.placeholder)}
      </div>
    </div>`;
    window.hydrateIcons(view);
    bindComposer(view, "thread");
    bindMessageActions(view);
    scrollToBottom();
  }

  function gptCard(item) {
    return `<button class="gpt-card" type="button">
      ${item.rank ? `<span class="gpt-rank">${item.rank}</span>` : ""}
      ${tile(item)}
      <span class="gpt-copy">
        <strong>${esc(item.name)}</strong>
        <span class="gpt-desc">${esc(item.desc)}</span>
        <span class="gpt-by">By ${esc(item.by)}</span>
      </span>
    </button>`;
  }

  function gptSections(sections, query) {
    const q = query.trim().toLowerCase();
    const html = sections
      .map((section) => {
        const items = section.items.filter(
          (item) => !q || item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || item.by.toLowerCase().includes(q)
        );
        if (!items.length) return "";
        return `<section class="gpt-section">
          <div class="gpt-section-head">
            <h2>${esc(section.title)}</h2>
            <p>${esc(section.subtitle)}</p>
          </div>
          <div class="gpt-grid">${items.map(gptCard).join("")}</div>
        </section>`;
      })
      .join("");
    return html || `<p class="page-empty">No GPTs match that search.</p>`;
  }

  function renderExplore(category) {
    const cat = category && category !== "gpts" ? A.explore[category] : null;
    const data = cat || A.gpts;
    const sections = cat
      ? [{ title: cat.title, subtitle: cat.subtitle, items: cat.items }]
      : A.gpts.sections;

    view.innerHTML = `<div class="page-scroll gpts-view">
      <div class="gpts-top">
        <a href="#/my-gpts" class="quiet-link">${esc(A.gpts.myGpts)}</a>
        <button class="create-btn" type="button"><span data-icon="plus"></span>${esc(A.gpts.create)}</button>
      </div>
      <div class="gpts-inner">
        ${
          cat
            ? ""
            : `<aside class="gpts-notice">
                <span class="notice-mark" data-icon="info"></span>
                <div><strong>${esc(A.gpts.notice.title)}</strong><p>${esc(A.gpts.notice.body)} <a href="${esc(
                  window.CONTENT.links.help
                )}" target="_blank" rel="noopener noreferrer">${esc(A.gpts.notice.link)}</a></p></div>
                <a class="notice-cta" href="#/plugins">${esc(A.gpts.notice.cta)}</a>
              </aside>`
        }
        <h1>${esc(data.title)}</h1>
        <p class="page-sub">${esc(data.subtitle)}</p>
        <div class="search-box gpt-search"><span data-icon="search"></span><input id="gpt-search" type="search" placeholder="${esc(
          A.gpts.searchPlaceholder
        )}" /></div>
        ${
          cat
            ? ""
            : `<div class="gpt-tabs" role="tablist">${A.gpts.categories
                .map(
                  (label, index) =>
                    `<button class="gpt-tab${index === 0 ? " is-active" : ""}" type="button" data-goto="${slug(label)}">${esc(
                      label
                    )}</button>`
                )
                .join("")}</div>`
        }
        <div id="gpt-sections">${gptSections(sections, "")}</div>
      </div>
    </div>`;

    window.hydrateIcons(view);
    const input = document.getElementById("gpt-search");
    const container = document.getElementById("gpt-sections");
    input.addEventListener("input", () => {
      container.innerHTML = gptSections(sections, input.value);
    });
    view.querySelectorAll("[data-goto]").forEach((tab) => {
      tab.addEventListener("click", () => {
        view.querySelectorAll("[data-goto]").forEach((other) => other.classList.toggle("is-active", other === tab));
        const target = [...container.querySelectorAll("section")].find((section) =>
          slug(section.querySelector("h2")?.textContent || "").includes(tab.dataset.goto)
        );
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    const create = view.querySelector(".create-btn");
    if (create) {
      create.addEventListener("click", () => {
        state.draft = "Help me create a GPT that ";
        window.location.hash = "#/";
      });
    }
  }

  function renderMyGpts() {
    view.innerHTML = `<div class="page-scroll gpts-view">
      <div class="gpts-top">
        <a href="#/gpts" class="quiet-link">${esc(A.myGpts.explore)}</a>
        <button class="create-btn" type="button" id="create-gpt"><span data-icon="plus"></span>${esc(A.gpts.create)}</button>
      </div>
      <div class="gpts-inner">
        <h1>${esc(A.myGpts.title)}</h1>
        <p class="page-sub">${esc(A.myGpts.subtitle)}</p>
        <div class="gpt-tabs" role="tablist">
          ${A.myGpts.tabs
            .map(
              (label, index) =>
                `<button class="gpt-tab${index === 0 ? " is-active" : ""}" type="button"${
                  index === 1 ? ' id="create-tab"' : ""
                }>${esc(label)}</button>`
            )
            .join("")}
        </div>
        <div class="empty-state my-gpts-empty">
          <p>${esc(A.myGpts.empty)}</p>
          <button class="create-btn" type="button" id="create-gpt-2"><span data-icon="plus"></span>${esc(A.myGpts.cta)}</button>
        </div>
      </div>
    </div>`;
    window.hydrateIcons(view);
    const create = () => {
      state.draft = "Help me create a GPT that ";
      window.location.hash = "#/";
    };
    document.getElementById("create-gpt").addEventListener("click", create);
    document.getElementById("create-gpt-2").addEventListener("click", create);
    document.getElementById("create-tab").addEventListener("click", create);
  }

  function renderSkills() {
    view.innerHTML = `<div class="page-scroll plugins-view">
      <div class="plugins-top">
        <div class="plugin-tabs" role="tablist">
          ${A.plugins.tabs
            .map(
              (label, index) =>
                `<button class="plugin-tab${index === 1 ? " is-active" : ""}" type="button" role="tab" aria-selected="${
                  index === 1
                }">${esc(label)}</button>`
            )
            .join("")}
        </div>
        <div class="plugins-actions">
          <button class="tool-btn" type="button" aria-label="Skill settings" data-icon="settings"></button>
          <button class="add-btn" type="button">Add<span data-icon="chevron-down"></span></button>
        </div>
      </div>
      <div class="plugins-inner">
        <h1>${esc(A.skills.title)}</h1>
        <p class="page-sub">${esc(A.skills.subtitle)}</p>
        <div class="search-box plugin-search"><span data-icon="search"></span><input id="skill-search" type="search" placeholder="${esc(
          A.skills.searchPlaceholder
        )}" /></div>
        ${A.skills.sections
          .map(
            (section) => `<section class="plugin-section">
              <button class="plugin-group" type="button">${esc(section.title)}<span data-icon="chevron-right"></span></button>
              <div class="plugin-grid2">
                ${section.items
                  .map(
                    (item) => `<div class="plugin-row">
                      ${tile(item, "lg")}
                      <div class="plugin-copy"><strong>${esc(item.name)}</strong><p>${esc(item.desc)}</p></div>
                      <button class="plugin-action" type="button" aria-label="${esc(item.name)}" data-icon="${
                      item.action === "more" ? "more" : "plus"
                    }"></button>
                    </div>`
                  )
                  .join("")}
              </div>
            </section>`
          )
          .join("")}
      </div>
    </div>`;
    window.hydrateIcons(view);
    view.querySelectorAll(".plugin-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        if (tab.textContent.trim() === "Plugins") renderPlugins();
        else renderSkills();
      });
    });
    const search = document.getElementById("skill-search");
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      view.querySelectorAll(".plugin-row").forEach((row) => {
        row.hidden = Boolean(q) && !row.textContent.toLowerCase().includes(q);
      });
    });
  }

  const FILE_ICONS = { pdf: "file", globe: "globe", doc: "file", file: "file", blank: "" };

  function renderLibrary() {
    view.innerHTML = `<div class="page-scroll library-view">
      <header class="lib-head">
        <h1>${esc(A.library.title)}</h1>
        <div class="lib-tools">
          <button class="tool-btn" type="button" aria-label="List view" data-icon="listw"></button>
          <button class="tool-btn is-on" type="button" aria-label="Grid view" data-icon="grid"></button>
          <div class="search-box lib-search"><span data-icon="search"></span><input id="library-search" type="search" placeholder="${esc(
            A.library.searchPlaceholder
          )}" /></div>
          <button class="new-btn" type="button">${esc(A.library.newLabel)}<span data-icon="chevron-down"></span></button>
          <button class="tool-btn" type="button" aria-label="Filter" data-icon="sliders"></button>
        </div>
      </header>
      <div class="lib-tabs" role="tablist">
        ${A.library.tabs
          .map(
            (label, index) =>
              `<button class="lib-tab${index === 0 ? " is-active" : ""}" type="button" role="tab" aria-selected="${index === 0}">${esc(
                label
              )}</button>`
          )
          .join("")}
      </div>
      <div class="lib-grid" id="lib-grid"></div>
    </div>`;

    window.hydrateIcons(view);
    const grid = document.getElementById("lib-grid");
    const input = document.getElementById("library-search");

    const draw = (query) => {
      const q = query.trim().toLowerCase();
      const files = A.library.files.filter((file) => !q || file.name.toLowerCase().includes(q));
      grid.innerHTML = files
        .map((file) => {
          if (!file.name) return `<div class="lib-card is-blank"></div>`;
          return `<button class="lib-card" type="button">
            <span class="lib-card-head"><span class="file-ico ${esc(file.kind)}" data-icon="${FILE_ICONS[file.kind] || "file"}"></span><span class="lib-name">${esc(
            file.name
          )}</span></span>
            <span class="lib-card-body"><span class="file-big ${esc(file.kind)}" data-icon="${FILE_ICONS[file.kind] || "file"}"></span></span>
          </button>`;
        })
        .join("");
      window.hydrateIcons(grid);
    };

    input.addEventListener("input", () => draw(input.value));
    view.querySelectorAll(".lib-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        view.querySelectorAll(".lib-tab").forEach((other) => {
          other.classList.toggle("is-active", other === tab);
          other.setAttribute("aria-selected", String(other === tab));
        });
      });
    });
    draw("");
  }

  function renderScheduled() {
    view.innerHTML = `<div class="page-scroll">
      <div class="page-narrow scheduled-view">
        <div class="sched-head">
          <div>
            <h1>${esc(A.scheduled.title)}</h1>
            <p class="page-sub">${esc(A.scheduled.subtitle)}</p>
          </div>
          <button class="filter-pill" type="button"><span data-icon="filter"></span>${esc(A.scheduled.filter)}</button>
        </div>
        ${composerHTML("scheduled", A.scheduled.placeholder)}
        <div class="sched-list">
          <button class="sched-group" type="button"><span>${esc(A.scheduled.recommended)}</span><span data-icon="chevron-down"></span></button>
          ${A.scheduled.items
            .map(
              (item) => `<div class="sched-row">
                <span class="sched-emoji">${esc(item.emoji)}</span>
                <div class="sched-copy"><strong>${esc(item.title)}</strong><p>${esc(item.desc)}</p></div>
                <button class="sched-add" type="button" aria-label="Add ${esc(item.title)}" data-icon="plus"></button>
              </div>`
            )
            .join("")}
        </div>
      </div>
    </div>`;
    window.hydrateIcons(view);
    bindComposer(view, "scheduled");
    view.querySelectorAll(".sched-row").forEach((row) => {
      row.addEventListener("click", (event) => {
        if (event.target.closest(".sched-add")) {
          row.classList.toggle("is-added");
          return;
        }
        const title = row.querySelector("strong").textContent;
        state.draft = title;
        window.location.hash = "#/";
      });
    });
  }

  function renderPlugins() {
    view.innerHTML = `<div class="page-scroll plugins-view">
      <div class="plugins-top">
        <div class="plugin-tabs" role="tablist">
          ${A.plugins.tabs
            .map(
              (label, index) =>
                `<button class="plugin-tab${index === 0 ? " is-active" : ""}" type="button" role="tab" aria-selected="${
                  index === 0
                }">${esc(label)}</button>`
            )
            .join("")}
        </div>
        <div class="plugins-actions">
          <button class="tool-btn" type="button" aria-label="Plugin settings" data-icon="settings"></button>
          <button class="add-btn" type="button">Add<span data-icon="chevron-down"></span></button>
        </div>
      </div>
      <div class="plugins-inner">
        <h1>${esc(A.plugins.title)}</h1>
        <p class="page-sub">${esc(A.plugins.subtitle)}</p>
        <div class="search-box plugin-search"><span data-icon="search"></span><input id="plugin-search" type="search" placeholder="${esc(
          A.plugins.searchPlaceholder
        )}" /></div>
        <section class="plugin-section installed">
          <button class="plugin-group" type="button">${esc(A.plugins.installedLabel)}<span data-icon="chevron-right"></span></button>
          <div class="installed-row">
            ${A.plugins.installed.map((item) => `<span class="app-tile lg tone-${esc(item.tone)}" title="${esc(item.name)}"><span>${esc(item.mark)}</span></span>`).join("")}
          </div>
          <button class="public-pill" type="button">${esc(A.plugins.publicLabel)}</button>
        </section>
        <div id="plugin-sections">
          ${A.plugins.sections
            .map(
              (section) => `<section class="plugin-section">
                <button class="plugin-group" type="button">${esc(section.title)}<span data-icon="chevron-right"></span></button>
                <div class="plugin-grid2">
                  ${section.items
                    .map(
                      (item) => `<div class="plugin-row">
                        ${tile(item, "lg")}
                        <div class="plugin-copy"><strong>${esc(item.name)}</strong><p>${esc(item.desc)}</p></div>
                        ${
                          item.action === "info"
                            ? `<button class="plugin-action" type="button" aria-label="Info about ${esc(item.name)}" data-icon="info"></button>`
                            : item.action === "more"
                            ? `<button class="plugin-action" type="button" aria-label="More about ${esc(item.name)}" data-icon="more"></button>`
                            : `<button class="plugin-action" type="button" aria-label="Add ${esc(item.name)}" data-icon="plus"></button>`
                        }
                      </div>`
                    )
                    .join("")}
                </div>
              </section>`
            )
            .join("")}
        </div>
      </div>
    </div>`;
    window.hydrateIcons(view);
    const search = document.getElementById("plugin-search");
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      view.querySelectorAll(".plugin-row").forEach((row) => {
        row.hidden = Boolean(q) && !row.textContent.toLowerCase().includes(q);
      });
    });
    view.querySelectorAll(".plugin-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        if (tab.textContent.trim() === "Skills") renderSkills();
        else renderPlugins();
      });
    });
  }

  function renderProjects() {
    view.innerHTML = `<div class="page-scroll projects-view">
      <header class="projects-head">
        <h1>${esc(A.projects.title)}</h1>
        <div class="projects-actions">
          <div class="search-box projects-search"><span data-icon="search"></span><input id="project-search" type="search" placeholder="${esc(
            A.projects.searchPlaceholder
          )}" /></div>
          <button class="create-btn" type="button"><span data-icon="plus"></span>${esc(A.projects.create)}</button>
        </div>
      </header>
      <div class="projects-table">
        <div class="projects-cols"><span>${esc(A.projects.headers[0])}</span><span>${esc(A.projects.headers[1])}<span data-icon="arrow-down"></span></span></div>
        <button class="projects-row" type="button"><span data-icon="lock"></span>${esc(A.projects.locked)}</button>
      </div>
    </div>`;
    window.hydrateIcons(view);
  }

  function settingsNavHTML(query) {
    const q = (query || "").trim().toLowerCase();
    return A.settings.nav
      .map((group) => {
        const items = group.items.filter((item) => !q || item.label.toLowerCase().includes(q));
        if (!items.length) return "";
        return `<div class="settings-group">
          <p class="settings-label">${esc(group.group)}</p>
          ${items
            .map((item) => {
              const active = item.label === state.settingsSection;
              if (item.icon === "avatar") {
                return `<button class="settings-link profile-link${active ? " is-active" : ""}" type="button" data-section="${esc(
                  item.label
                )}"><span class="avatar tiny">${esc(A.profile.initials)}</span><span>${esc(item.label)}</span><span data-icon="arrow-up-right"></span></button>`;
              }
              return `<button class="settings-link${active ? " is-active" : ""}" type="button" data-section="${esc(
                item.label
              )}"><span data-icon="${esc(item.icon)}"></span><span>${esc(item.label)}</span></button>`;
            })
            .join("")}
        </div>`;
      })
      .join("");
  }

  function settingsPaneHTML(label) {
    if (label === "Account") {
      const acc = A.settings.account;
      return `<div class="settings-pane">
        <a class="mobile-back" href="#/" data-icon="arrow-left">${esc(A.settings.back)}</a>
        <h1>${esc(acc.title)}</h1>
        <p class="page-sub">${esc(acc.subtitle)}</p>
        <section class="settings-details">
          <h2>${esc(acc.details)}</h2>
          ${acc.rows
            .map(
              (row) => `<div class="settings-row">
                <div><strong>${esc(row.label)}</strong><p>${esc(row.desc)}</p></div>
                <div class="settings-value">${esc(row.value)}${
                row.edit ? `<button class="edit-btn" type="button" aria-label="Edit ${esc(row.label)}" data-icon="pencil"></button>` : ""
              }</div>
              </div>`
            )
            .join("")}
        </section>
        <section class="settings-details gpt-profile">
          <h2>GPT builder profile</h2>
          <div class="settings-row">
            <div><strong class="sr-only">GPT builder profile</strong><p>The display name on your GPT builder profile</p></div>
            <div class="settings-value">${esc(acc.gptProfile)}<button class="edit-btn" type="button" aria-label="Edit GPT builder profile" data-icon="pencil"></button></div>
          </div>
        </section>
        <section class="settings-details delete-account">
          <h2 class="sr-only">Delete account</h2>
          <div class="settings-row">
            <div><strong>${esc(acc.deleteTitle)}</strong><p>${esc(acc.deleteBody)}</p></div>
            <button class="delete-btn" type="button">${esc(acc.deleteCta)}</button>
          </div>
        </section>
      </div>`;
    }

    const pane = A.settings.panes[label] || {
      subtitle: `Manage ${label.toLowerCase()} for your account.`,
      rows: [{ label, desc: "This setting is part of the visual replica.", value: "Default" }],
    };
    return `<div class="settings-pane">
      <a class="mobile-back" href="#/" data-icon="arrow-left">${esc(A.settings.back)}</a>
      <h1>${esc(label)}</h1>
      <p class="page-sub">${esc(pane.subtitle)}</p>
      <section class="settings-details">
        <h2>Details</h2>
        ${pane.rows
          .map(
            (row) => `<div class="settings-row">
              <div><strong>${esc(row.label)}</strong><p>${esc(row.desc)}</p></div>
              <div class="settings-value">${esc(row.value)}</div>
            </div>`
          )
          .join("")}
      </section>
    </div>`;
  }

  function renderSettings() {
    view.innerHTML = `<div class="settings-screen">
      <aside class="settings-side" aria-label="Settings navigation">
        <button class="settings-toggle" type="button" aria-label="Collapse settings navigation" data-icon="panel"></button>
        <a class="back-link" href="#/" data-icon="arrow-left">${esc(A.settings.back)}</a>
        <div class="search-box settings-search"><span data-icon="search"></span><input id="settings-search" type="search" placeholder="${esc(
          A.settings.searchPlaceholder
        )}" /></div>
        <nav class="settings-nav" id="settings-nav">${settingsNavHTML("")}</nav>
      </aside>
      <div class="settings-main" id="settings-main">${settingsPaneHTML(state.settingsSection)}</div>
    </div>`;

    window.hydrateIcons(view);
    const navBox = document.getElementById("settings-nav");
    const main = document.getElementById("settings-main");
    const search = document.getElementById("settings-search");

    navBox.addEventListener("click", (event) => {
      const link = event.target.closest("[data-section]");
      if (!link) return;
      state.settingsSection = link.dataset.section;
      navBox.innerHTML = settingsNavHTML(search.value);
      main.innerHTML = settingsPaneHTML(state.settingsSection);
      window.hydrateIcons(navBox);
      window.hydrateIcons(main);
      history.replaceState(null, "", `#/settings/${slug(state.settingsSection)}`);
    });
    search.addEventListener("input", () => {
      navBox.innerHTML = settingsNavHTML(search.value);
      window.hydrateIcons(navBox);
    });
    view.querySelector(".settings-toggle").addEventListener("click", () => {
      view.querySelector(".settings-screen").classList.toggle("nav-collapsed");
    });
  }

  function renderImages() {
    view.innerHTML = `<div class="page-scroll"><div class="page-narrow simple-page">
      <h1>${esc(A.images.title)}</h1>
      <p class="page-sub">${esc(A.images.subtitle)}</p>
      <div class="empty-state"><p>${esc(A.images.empty)}</p><button class="create-btn" type="button" id="create-image">${esc(
      A.images.cta
    )}</button></div>
    </div></div>`;
    document.getElementById("create-image").addEventListener("click", () => {
      state.draft = A.images.prompt;
      window.location.hash = "#/";
    });
  }

  function renderResearch() {
    view.innerHTML = `<div class="signed-home"><div class="signed-center">
      <h1>${esc(A.research.heading)}</h1>
      <p class="page-sub centered">${esc(A.research.subtitle)}</p>
      ${composerHTML("home", A.home.placeholder)}
    </div></div>`;
    window.hydrateIcons(view);
    state.draft = A.research.prompt;
    bindComposer(view, "home");
  }

  /* -------------------------------------------------------------- messaging */
  function scrollToBottom() {
    const box = document.getElementById("thread-scroll");
    if (box) box.scrollTop = box.scrollHeight;
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
            button.setAttribute("aria-label", A.copied);
            setTimeout(() => button.classList.remove("is-on"), 1200);
          } catch (err) {
            /* clipboard may be blocked */
          }
        } else if (action === "speak" || action === "share" || action === "more") {
          button.classList.toggle("is-on");
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
    node.innerHTML = `<div class="msg-body">
      <div class="prose"></div>
      <div class="msg-actions" hidden>
        <button type="button" data-action="copy" aria-label="${esc(A.copy)}" data-icon="copy"></button>
        <button type="button" data-action="up" aria-label="${esc(A.goodResponse)}" data-icon="thumb-up"></button>
        <button type="button" data-action="down" aria-label="${esc(A.badResponse)}" data-icon="thumb-down"></button>
        <button type="button" data-action="speak" aria-label="Read aloud" data-icon="volume"></button>
        <button type="button" data-action="share" aria-label="Share" data-icon="share"></button>
        <button type="button" data-action="more" aria-label="More" data-icon="more"></button>
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
      const notice = aborted ? A.noticeStopped : err.code === "no_key" ? A.noticeNoKey : A.noticeError;
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
