/* Signed-in ChatGPT replica: navigation, page renderers, local stores and the streaming client. */
(function () {
  const A = window.CONTENT.app;
  const T = A.toast;
  const M = A.menu;
  const Session = window.Session;
  const session = Session.get();

  if (!session) {
    window.location.replace("auth.html");
    return;
  }

  const USER = String(session.email || "local").toLowerCase();
  const KEYS = {
    chats: `cg.chats:${USER}`,
    library: `cg.library:${USER}`,
    images: `cg.images:${USER}`,
    projects: `cg.projects:${USER}`,
    prefs: `cg.prefs:${USER}`,
    profile: `cg.profile:${USER}`,
    settings: `cg.settings:${USER}`,
    plugins: `cg.plugins:${USER}`,
    skills: `cg.skills:${USER}`,
    gpts: `cg.gpts:${USER}`,
    scheduled: `cg.scheduled:${USER}`,
  };

  const state = {
    convId: null,
    settingsSection: "Account",
    streaming: false,
    controller: null,
    draft: null,
    temp: false,
    tempChat: null,
    think: false,
    projectId: null,
    pendingSystem: null,
    libTab: 0,
    libFilter: "All",
    libView: "grid",
    schedFilter: "Active",
    searchOpen: false,
  };

  /* ------------------------------------------------------------------ basics */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function removeKey(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      /* storage may be unavailable */
    }
  }

  function format(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) =>
      values && values[key] != null ? values[key] : match
    );
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `c${Date.now()}${Math.random().toString(16).slice(2)}`;
  }

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
    const cleaned = String(text).replace(/\s+/g, " ").trim();
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
    return `<span class="app-tile ${size || ""} tone-${esc(item.tone || "plain")}"><span>${esc(
      item.mark || item.name.charAt(0)
    )}</span></span>`;
  }

  function slug(label) {
    return String(label)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function initialsOf(name, email) {
    const source = String(name || "").trim() || String(email || "");
    const words = source.split(/[\s.@_-]+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase() || "?";
  }

  function fmtDate(time) {
    try {
      return new Date(time).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch (err) {
      return "";
    }
  }

  /* ------------------------------------------------------------------ toast */
  function toast(message) {
    if (!message) return;
    let el = document.getElementById("cg-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "cg-toast";
      el.setAttribute("role", "status");
      el.style.cssText =
        "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:200;max-width:min(520px,90vw);" +
        "padding:11px 16px;border-radius:12px;background:var(--text);color:var(--bg);font:14px/20px var(--font-sans);" +
        "box-shadow:var(--shadow-pop);pointer-events:none;opacity:0;transition:opacity 160ms ease";
      document.body.append(el);
    }
    el.textContent = message;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.style.opacity = "0";
    }, 2400);
  }

  /* --------------------------------------------------------------- popovers */
  let openPop = null;

  function closePopover() {
    if (openPop) {
      openPop.remove();
      openPop = null;
    }
  }

  function showPopover(anchor, items) {
    if (!anchor) return null;
    closePopover();
    const el = document.createElement("div");
    el.className = "popover";
    el.style.position = "fixed";
    el.style.zIndex = "120";
    items.forEach((item) => {
      if (item === "-") {
        el.append(document.createElement("hr"));
        return;
      }
      const button = document.createElement("button");
      button.type = "button";
      if (item.icon) {
        const icon = document.createElement("span");
        icon.dataset.icon = item.icon;
        button.append(icon);
      }
      const label = document.createElement("span");
      label.textContent = item.label;
      button.append(label);
      if (item.danger) button.style.color = "var(--danger)";
      button.addEventListener("click", () => {
        closePopover();
        if (item.onSelect) item.onSelect();
      });
      el.append(button);
    });
    document.body.append(el);
    window.hydrateIcons(el);
    const rect = anchor.getBoundingClientRect();
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    let left = Math.min(rect.left, window.innerWidth - width - 12);
    left = Math.max(12, left);
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 6);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    openPop = el;
    return el;
  }

  /* ----------------------------------------------------------------- modals */
  let openModalEl = null;

  function closeModal() {
    if (openModalEl) {
      openModalEl.remove();
      openModalEl = null;
    }
  }

  function showModal(options) {
    closeModal();
    const overlay = document.createElement("div");
    overlay.id = "cg-modal";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:150;display:grid;place-items:center;padding:20px;" +
      "background:rgba(0,0,0,.32);backdrop-filter:blur(2px)";
    const panel = document.createElement("div");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.style.cssText =
      "width:min(560px,94vw);max-height:88vh;overflow:auto;background:var(--surface);color:var(--text);" +
      "border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-pop);padding:24px;" +
      "font:14px/22px var(--font-sans)";

    if (options.title) {
      const heading = document.createElement("h2");
      heading.textContent = options.title;
      heading.style.cssText = "margin:0 0 10px;font-size:20px;line-height:26px;font-weight:600";
      panel.append(heading);
    }
    if (options.body) {
      const body = document.createElement("div");
      body.innerHTML = options.body;
      body.style.cssText = "color:var(--muted);font-size:14px;line-height:22px";
      panel.append(body);
    }

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:20px";
    (options.actions || []).forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.style.cssText =
        "padding:8px 14px;border-radius:999px;border:1px solid var(--border);background:var(--surface);" +
        "color:var(--text);font:inherit;cursor:pointer" +
        (action.primary ? ";background:var(--text);color:var(--bg);border-color:var(--text)" : "") +
        (action.danger ? ";color:var(--danger);border-color:rgba(197,59,59,.4)" : "");
      button.addEventListener("click", () => {
        if (action.close !== false) closeModal();
        if (action.onSelect) action.onSelect();
      });
      actions.append(button);
    });
    if (actions.children.length) panel.append(actions);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal();
    });
    overlay.append(panel);
    document.body.append(overlay);
    openModalEl = overlay;
    const first = panel.querySelector("button");
    if (first) first.focus();
  }

  /* ----------------------------------------------------------------- speech */
  const Speech = {
    supported: typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined",
    current: null,
    stop() {
      if (this.supported) window.speechSynthesis.cancel();
      if (this.current && this.current.button) this.current.button.classList.remove("is-on");
      this.current = null;
    },
    toggle(text, button) {
      if (!this.supported) {
        toast(A.toast.dictationUnsupported);
        return;
      }
      if (this.current && this.current.button === button) {
        this.stop();
        return;
      }
      this.stop();
      const utterance = new SpeechSynthesisUtterance(String(text || "").slice(0, 6000));
      utterance.lang = navigator.language || "en-US";
      utterance.onend = () => {
        if (button) button.classList.remove("is-on");
        if (this.current && this.current.button === button) this.current = null;
      };
      utterance.onerror = utterance.onend;
      this.current = { button, utterance };
      if (button) button.classList.add("is-on");
      window.speechSynthesis.speak(utterance);
    },
  };

  function dictate(textarea, button) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast(T.dictationUnsupported);
      textarea.focus();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    const base = textarea.value ? `${textarea.value} ` : "";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      textarea.value = `${base}${transcript}`;
      autosize(textarea);
      textarea.dispatchEvent(new Event("input"));
    };
    recognition.onerror = (event) => {
      if (event && event.error === "not-allowed") toast(T.micDenied);
      if (button) button.classList.remove("is-on");
    };
    recognition.onend = () => {
      if (button) button.classList.remove("is-on");
      textarea.focus();
    };
    try {
      recognition.start();
      if (button) button.classList.add("is-on");
      toast(T.listening);
    } catch (err) {
      if (button) button.classList.remove("is-on");
    }
  }

  function pickFiles(accept, multiple) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept || "";
      input.multiple = Boolean(multiple);
      input.addEventListener("change", () => resolve(Array.from(input.files || [])));
      input.click();
    });
  }

  async function attachFiles(textarea) {
    const files = await pickFiles("text/*,.md,.json,.csv,.js,.ts,.html,.css,.py,.txt,.pdf,image/*", true);
    for (const file of files) {
      try {
        if (/\.(pdf|png|jpe?g|gif|webp)$/i.test(file.name) || file.size > 512 * 1024) {
          textarea.value = `${textarea.value}${textarea.value ? "\n\n" : ""}[Attached file: ${file.name}]`;
          toast(format(T.attachmentAdded, { name: file.name }));
        } else {
          const text = await file.text();
          textarea.value = `${textarea.value}${textarea.value ? "\n\n" : ""}[File: ${file.name}]\n${text.slice(0, 20000)}`;
          toast(format(T.attachmentAdded, { name: file.name }));
        }
      } catch (err) {
        toast(format(T.attachmentFailed, { name: file.name }));
      }
    }
    autosize(textarea);
    textarea.dispatchEvent(new Event("input"));
    textarea.focus();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      /* fall through to execCommand */
    }
    try {
      const scratch = document.createElement("textarea");
      scratch.value = text;
      scratch.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
      document.body.append(scratch);
      scratch.select();
      const ok = document.execCommand("copy");
      scratch.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }

  function downloadFile(name, options = {}) {
    const anchor = document.createElement("a");
    anchor.download = name;
    if (options.url) {
      anchor.href = options.url;
    } else {
      const blob = new Blob([options.text || ""], { type: options.type || "text/plain;charset=utf-8" });
      anchor.href = URL.createObjectURL(blob);
      setTimeout(() => URL.revokeObjectURL(anchor.href), 4000);
    }
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    toast(T.downloadStarted);
  }

  /* ------------------------------------------------------------------ prefs */
  const Prefs = {
    all() {
      return readJSON(KEYS.prefs, {});
    },
    get(key, fallback) {
      const value = this.all()[key];
      return value === undefined ? fallback : value;
    },
    set(key, value) {
      const all = this.all();
      all[key] = value;
      writeJSON(KEYS.prefs, all);
    },
  };

  /* ---------------------------------------------------------------- profile */
  const Profile = {
    defaults() {
      const account = A.settings.account;
      return { name: A.profile.name, username: account.username, gptProfile: account.gptProfile, plan: A.profile.plan };
    },
    get() {
      return { ...this.defaults(), ...readJSON(KEYS.profile, {}) };
    },
    set(patch) {
      writeJSON(KEYS.profile, { ...this.get(), ...patch });
    },
  };

  const SettingsStore = {
    all() {
      return readJSON(KEYS.settings, {});
    },
    get(section, label, fallback) {
      const sectionValues = this.all()[section] || {};
      return sectionValues[label] === undefined ? fallback : sectionValues[label];
    },
    set(section, label, value) {
      const all = this.all();
      all[section] = all[section] || {};
      all[section][label] = value;
      writeJSON(KEYS.settings, all);
    },
  };

  /* ------------------------------------------------------------ chat store */
  const ChatStore = {
    all() {
      return readJSON(KEYS.chats, []);
    },
    write(list) {
      writeJSON(KEYS.chats, list);
    },
    get(id) {
      if (state.tempChat && id === "temp") return state.tempChat;
      return this.all().find((chat) => chat.id === id) || null;
    },
    create(title, extra = {}) {
      const now = Date.now();
      const chat = {
        id: state.temp ? "temp" : uid(),
        title: title || "New chat",
        messages: [],
        createdAt: now,
        updatedAt: now,
        ...extra,
      };
      if (state.temp) {
        state.tempChat = chat;
        return chat;
      }
      const list = this.all();
      list.unshift(chat);
      this.write(list);
      return chat;
    },
    addMessage(id, message) {
      if (state.tempChat && id === "temp") {
        state.tempChat.messages.push(message);
        state.tempChat.updatedAt = Date.now();
        return;
      }
      const list = this.all();
      const chat = list.find((item) => item.id === id);
      if (!chat) return;
      chat.messages.push(message);
      chat.updatedAt = Date.now();
      this.write(list);
    },
    updateMessage(id, index, patch) {
      if (state.tempChat && id === "temp") {
        const message = state.tempChat.messages[index];
        if (message) Object.assign(message, patch);
        return;
      }
      const list = this.all();
      const chat = list.find((item) => item.id === id);
      if (!chat || !chat.messages[index]) return;
      Object.assign(chat.messages[index], patch);
      chat.updatedAt = Date.now();
      this.write(list);
    },
    replaceMessages(id, messages) {
      if (state.tempChat && id === "temp") {
        state.tempChat.messages = messages;
        return;
      }
      const list = this.all();
      const chat = list.find((item) => item.id === id);
      if (!chat) return;
      chat.messages = messages;
      chat.updatedAt = Date.now();
      this.write(list);
    },
    rename(id, title) {
      if (state.tempChat && id === "temp") {
        state.tempChat.title = title;
        return;
      }
      const list = this.all();
      const chat = list.find((item) => item.id === id);
      if (!chat) return;
      chat.title = title;
      chat.updatedAt = Date.now();
      this.write(list);
    },
    remove(id) {
      this.write(this.all().filter((chat) => chat.id !== id));
    },
    clear() {
      this.write([]);
    },
  };

  function seedChats() {
    if (localStorage.getItem(KEYS.chats) !== null) return;
    const legacy = readJSON("cg.chats", null);
    if (Array.isArray(legacy) && legacy.length) {
      ChatStore.write(legacy);
      return;
    }
    const now = Date.now();
    ChatStore.write(
      A.seed.titles.map((title, index) => ({
        id: uid(),
        title,
        messages: [{ role: "assistant", content: A.seed.message, at: now - index * 60000 }],
        createdAt: now - index * 60000,
        updatedAt: now - index * 60000,
      }))
    );
  }

  /* ---------------------------------------------------------- other stores */
  const ImagesStore = {
    all() {
      return readJSON(KEYS.images, []);
    },
    add(image) {
      const list = this.all();
      list.unshift({ id: uid(), at: Date.now(), ...image });
      if (!writeJSON(KEYS.images, list.slice(0, 80))) {
        writeJSON(KEYS.images, list.slice(0, 10));
      }
    },
    remove(id) {
      writeJSON(KEYS.images, this.all().filter((image) => image.id !== id));
    },
  };

  function librarySeed() {
    return A.library.files.map((file, index) => ({
      id: uid(),
      name: file.name,
      kind: file.kind,
      blank: !file.name,
      favorite: false,
      at: Date.now() - index * 3600000,
    }));
  }

  const LibraryStore = {
    all() {
      const stored = readJSON(KEYS.library, null);
      if (Array.isArray(stored)) return stored;
      const seeded = librarySeed();
      writeJSON(KEYS.library, seeded);
      return seeded;
    },
    write(list) {
      writeJSON(KEYS.library, list);
    },
    add(entry) {
      const list = this.all();
      list.unshift({ id: uid(), at: Date.now(), ...entry });
      this.write(list);
    },
    remove(id) {
      this.write(this.all().filter((file) => file.id !== id));
    },
    update(id, patch) {
      const list = this.all();
      const file = list.find((item) => item.id === id);
      if (!file) return;
      Object.assign(file, patch);
      this.write(list);
    },
  };

  const ProjectStore = {
    all() {
      return readJSON(KEYS.projects, []);
    },
    write(list) {
      writeJSON(KEYS.projects, list);
    },
    add(name) {
      const project = { id: uid(), name, createdAt: Date.now(), updatedAt: Date.now(), chatId: null };
      const list = this.all();
      list.unshift(project);
      this.write(list);
      return project;
    },
    touch(id, chatId) {
      const list = this.all();
      const project = list.find((item) => item.id === id);
      if (!project) return;
      project.chatId = chatId;
      project.updatedAt = Date.now();
      this.write(list);
    },
    remove(id) {
      this.write(this.all().filter((item) => item.id !== id));
    },
  };

  const GptStore = {
    all() {
      return readJSON(KEYS.gpts, []);
    },
    add(gpt) {
      const list = this.all();
      list.unshift({ id: uid(), createdAt: Date.now(), ...gpt });
      writeJSON(KEYS.gpts, list);
    },
  };

  const ScheduledStore = {
    all() {
      return readJSON(KEYS.scheduled, []);
    },
    write(list) {
      writeJSON(KEYS.scheduled, list);
    },
    add(task) {
      const list = this.all();
      list.unshift({ id: uid(), at: Date.now(), active: true, ...task });
      this.write(list);
      return list[0];
    },
    remove(id) {
      this.write(this.all().filter((task) => task.id !== id));
    },
  };

  const PluginStore = {
    plugins() {
      const stored = readJSON(KEYS.plugins, null);
      if (Array.isArray(stored)) return stored;
      return A.plugins.installed.map((item) => item.name);
    },
    setPlugins(list) {
      writeJSON(KEYS.plugins, list);
    },
    skills() {
      const stored = readJSON(KEYS.skills, null);
      if (Array.isArray(stored)) return stored;
      const installed = A.skills.sections.find((section) => section.title === "Installed");
      return installed ? installed.items.map((item) => item.name) : [];
    },
    setSkills(list) {
      writeJSON(KEYS.skills, list);
    },
    toggle(kind, name) {
      const list = kind === "skill" ? this.skills() : this.plugins();
      const index = list.indexOf(name);
      if (index >= 0) list.splice(index, 1);
      else list.push(name);
      if (kind === "skill") this.setSkills(list);
      else this.setPlugins(list);
      return index < 0;
    },
    installed(kind, name) {
      return (kind === "skill" ? this.skills() : this.plugins()).includes(name);
    },
  };

  function pluginCatalog() {
    const map = new Map();
    A.plugins.installed.forEach((item) => map.set(item.name, item));
    A.plugins.sections.forEach((section) => section.items.forEach((item) => map.set(item.name, item)));
    A.skills.sections.forEach((section) => section.items.forEach((item) => map.set(item.name, item)));
    return map;
  }

  /* ------------------------------------------------------------------- chrome */
  const app = document.getElementById("app");
  const view = document.getElementById("view");
  const chatList = document.getElementById("chat-list");
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");
  const searchModal = document.getElementById("search-modal");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const accountBtn = document.getElementById("account-btn");
  const accountPopover = document.getElementById("account-popover");

  function renderAccount() {
    const profile = Profile.get();
    document.getElementById("account-avatar").textContent = initialsOf(profile.name, session.email);
    document.getElementById("account-name").textContent = profile.name;
    document.getElementById("account-plan").textContent = profile.plan;
    document.getElementById("account-email").textContent = session.email;
  }

  function closePopovers() {
    accountPopover.hidden = true;
    accountBtn.setAttribute("aria-expanded", "false");
    const explore = document.querySelector(".explore-menu");
    if (explore) explore.hidden = true;
  }

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
        const anchor = document.createElement("a");
        anchor.href = entry.href;
        anchor.textContent = entry.label;
        menu.append(anchor);
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
      const opening = !exploreMenu || exploreMenu.hidden;
      closePopovers();
      closePopover();
      if (exploreMenu) exploreMenu.hidden = !opening;
      if (opening && exploreMenu) {
        exploreMenu.style.top = `${explore.offsetTop + explore.offsetHeight + 2}px`;
      }
      return;
    }
    closePopovers();
  });

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
    if (!event.target.closest(".popover")) closePopover();
    if (!event.target.closest(".explore-menu") && !event.target.closest("[data-explore]")) closePopovers();
    const stop = event.target.closest(".send-btn.is-stop");
    if (stop) {
      event.preventDefault();
      if (state.controller) state.controller.abort();
    }
    const gptCardEl = event.target.closest("[data-gpt]");
    if (gptCardEl) {
      try {
        openGpt(JSON.parse(gptCardEl.dataset.gpt));
      } catch (err) {
        /* ignore a malformed card */
      }
    }
    const createGpt = event.target.closest("[data-create-gpt]");
    if (createGpt) createGptFlow();
    const createProject = event.target.closest("[data-create-project]");
    if (createProject) createProjectFlow();

    const pluginKind = document.getElementById("skill-search") ? "skill" : "plugin";
    const pluginToggle = event.target.closest("[data-plugin-toggle]");
    if (pluginToggle) {
      togglePlugin(pluginToggle.dataset.pluginToggle, pluginKind);
      return;
    }
    const pluginInfo = event.target.closest("[data-plugin-info]");
    if (pluginInfo) {
      showPluginInfo(pluginInfo.dataset.pluginInfo, pluginKind);
      return;
    }
    const installedTile = event.target.closest("[data-installed]");
    if (installedTile) {
      showPluginInfo(installedTile.dataset.installed, pluginKind);
      return;
    }
    const pluginGroup = event.target.closest(".plugin-group");
    if (pluginGroup) {
      const section = pluginGroup.closest(".plugin-section");
      const grid = section && section.querySelector(".plugin-grid2, .installed-row");
      if (!grid) return;
      const hide = !grid.hidden;
      grid.hidden = hide;
      const chevron = pluginGroup.querySelector('[data-icon="chevron-right"]');
      if (chevron) chevron.style.transform = hide ? "" : "rotate(90deg)";
      return;
    }
    const pluginTab = event.target.closest(".plugin-tab");
    if (pluginTab) {
      if (pluginTab.textContent.trim() === "Skills") renderSkills();
      else renderPlugins();
      return;
    }

    const imageCreate = event.target.closest("[data-image-create]");
    if (imageCreate) {
      state.draft = A.images.prompt;
      window.location.hash = "#/";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePopover();
      closeModal();
      closeSearch();
      closeSidebar();
      closePopovers();
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
    Prefs.set("sidebarCollapsed", false);
  });
  document.getElementById("sb-collapse").addEventListener("click", () => {
    if (window.innerWidth <= 900) {
      closeSidebar();
    } else {
      app.classList.add("sidebar-collapsed");
      Prefs.set("sidebarCollapsed", true);
    }
  });
  if (Prefs.get("sidebarCollapsed", false)) app.classList.add("sidebar-collapsed");

  /* ------------------------------------------------------------ projects nav */
  const projectsBlock = document.querySelector(".sb-block");
  const projectList = document.createElement("div");
  projectList.className = "chat-list";
  projectList.id = "project-list";
  const projectsHead = projectsBlock.querySelector(".sb-block-head");
  projectsHead.after(projectList);

  projectsHead.querySelector(".sb-block-title").addEventListener("click", () => {
    window.location.hash = "#/projects";
  });
  projectsHead.querySelector(".sb-mini").addEventListener("click", (event) => {
    event.stopPropagation();
    createProjectFlow();
  });

  function renderProjectList() {
    const projects = ProjectStore.all();
    const empty = projectsBlock.querySelector(".sb-empty");
    projectList.innerHTML = "";
    if (!projects.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    const more = projects.slice(0, 6);
    more.forEach((project) => {
      const row = document.createElement("div");
      row.className = "chat-item";
      const link = document.createElement("a");
      link.className = "chat-link";
      link.href = "#/projects";
      link.textContent = project.name;
      link.title = project.name;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openProject(project);
      });
      row.append(link);
      projectList.append(row);
    });
  }

  function createProjectFlow() {
    const name = window.prompt(A.prompts.newProject, "");
    if (!name || !name.trim()) return;
    const project = ProjectStore.add(name.trim());
    renderProjectList();
    toast(format(T.projectCreated, { name: project.name }));
    if (window.location.hash.startsWith("#/projects")) renderProjects();
    else openProject(project);
  }

  function openProject(project) {
    state.temp = false;
    state.tempChat = null;
    const existing = ChatStore.all().find((chat) => chat.projectId === project.id);
    if (existing) {
      window.location.hash = `#/c/${existing.id}`;
      return;
    }
    const chat = ChatStore.create(project.name, {
      projectId: project.id,
      system: `You are helping inside the project “${project.name}”. Keep replies focused on this project.`,
    });
    ProjectStore.touch(project.id, chat.id);
    window.location.hash = `#/c/${chat.id}`;
  }

  /* -------------------------------------------------------------- chat list */
  function renderChatList() {
    chatList.innerHTML = "";
    const chats = ChatStore.all().sort((a, b) => b.updatedAt - a.updatedAt);
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
    const chat = ChatStore.get(id);
    ChatStore.remove(id);
    if (state.convId === id) {
      state.convId = null;
      window.location.hash = "#/";
    }
    renderChatList();
    renderProjectList();
    if (chat) toast(T.deleted);
  });

  const recentsMore = document.querySelector('.sb-recents .sb-mini');
  if (recentsMore) {
    recentsMore.addEventListener("click", (event) => {
      event.stopPropagation();
      showPopover(recentsMore, [
        { label: M.search, icon: "search", onSelect: openSearch },
        {
          label: M.clearAll,
          icon: "trash",
          danger: true,
          onSelect: () => {
            if (!ChatStore.all().length) return;
            if (!window.confirm(A.confirm.clearChats)) return;
            ChatStore.clear();
            state.convId = null;
            window.location.hash = "#/";
            renderChatList();
            toast(T.cleared);
          },
        },
      ]);
    });
  }

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
    state.searchOpen = true;
    searchInput.value = "";
    drawSearch("");
    window.hydrateIcons(searchModal);
    setTimeout(() => searchInput.focus(), 20);
  }
  function closeSearch() {
    if (searchModal.hidden) return;
    searchModal.hidden = true;
    state.searchOpen = false;
    if (window.location.hash === "#/search") history.replaceState(null, "", "#/");
  }
  function drawSearch(query) {
    const q = query.trim().toLowerCase();
    const chats = ChatStore.all()
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

  /* -------------------------------------------------------------- composers */
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

  function bindComposer(root, kind, options = {}) {
    const form = root.querySelector(`.composer[data-composer="${kind}"]`);
    if (!form) return;
    const textarea = form.querySelector("textarea");
    const send = form.querySelector(".send-btn");
    const onSubmit = options.onSubmit || ((text) => sendMessage(text));

    if (state.draft) {
      textarea.value = state.draft;
      state.draft = null;
    }
    autosize(textarea);
    if (send) send.disabled = !textarea.value.trim();

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
      if (!text) {
        textarea.focus();
        return;
      }
      if (state.streaming) return;
      textarea.value = "";
      autosize(textarea);
      if (send) send.disabled = true;
      onSubmit(text);
    });

    const plus = form.querySelector('button[aria-label="Add files and more"]');
    if (plus) plus.addEventListener("click", () => attachFiles(textarea));

    const mic = form.querySelector('button[aria-label="Dictate"]');
    if (mic) mic.addEventListener("click", () => dictate(textarea, mic));

    const voice = form.querySelector(".composer-voice");
    if (voice) {
      voice.classList.toggle("is-on", Prefs.get("voiceReplies", false));
      voice.addEventListener("click", () => {
        const next = !Prefs.get("voiceReplies", false);
        Prefs.set("voiceReplies", next);
        voice.classList.toggle("is-on", next);
        if (!next) Speech.stop();
        toast(next ? T.voiceOn : T.voiceOff);
        if (next) dictate(textarea, voice);
        else textarea.focus();
      });
    }

    const think = form.querySelector(".think-btn");
    if (think) {
      think.classList.toggle("is-on", state.think);
      think.addEventListener("click", () => {
        state.think = !state.think;
        think.classList.toggle("is-on", state.think);
        textarea.focus();
      });
    }

    window.hydrateIcons(form);
    if (kind === "home" && window.innerWidth > 900) setTimeout(() => textarea.focus(), 20);
  }

  /* ---------------------------------------------------------------- router */
  function route() {
    const hash = window.location.hash || "#/";
    state.convId = hash.startsWith("#/c/") ? hash.slice(4) : null;
    const isTemp = hash.startsWith("#/temporary");
    if (!isTemp && state.temp) {
      state.temp = false;
      state.tempChat = null;
    }
    document.title = "ChatGPT";
    closePopovers();
    closePopover();
    closeModal();
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
    } else if (hash.startsWith("#/plugins/skills")) {
      renderSkills();
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
    } else if (isTemp) {
      state.temp = true;
      if (state.tempChat) renderConversation("temp");
      else renderHome(true);
    } else {
      renderHome();
    }

    highlightNav(hash);
    renderChatList();
    renderProjectList();
  }

  window.addEventListener("hashchange", route);

  /* ------------------------------------------------------------------ views */
  function renderHome(showTemp) {
    view.innerHTML = `<div class="signed-home">
      <button class="temp-chat" type="button" aria-label="${esc(A.home.temporaryChat)}" data-icon="temp"></button>
      <div class="signed-center">
        ${
          showTemp
            ? `<div class="temp-note"><span data-icon="temp"></span>Temporary chat — this conversation won’t appear in history.</div>`
            : ""
        }
        <h1>${esc(A.home.greeting)}</h1>
        ${composerHTML("home", A.home.placeholder)}
        <div class="quick-list">
          ${A.home.suggestions
            .map(
              (item) =>
                `<button class="quick" type="button" data-suggest="${esc(
                  item.label === "Create an image" ? "Create an image of " : item.label
                )}"><span class="quick-ico" data-icon="${esc(item.icon)}"></span><span>${esc(item.label)}</span></button>`
            )
            .join("")}
        </div>
      </div>
    </div>`;
    window.hydrateIcons(view);
    state.temp = Boolean(showTemp);
    bindComposer(view, "home");
    view.querySelectorAll("[data-suggest]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const textarea = view.querySelector("textarea");
        textarea.value = chip.dataset.suggest;
        autosize(textarea);
        textarea.dispatchEvent(new Event("input"));
        textarea.focus();
      });
    });
    view.querySelector(".temp-chat").addEventListener("click", () => {
      if (showTemp) window.location.hash = "#/";
      else window.location.hash = "#/temporary";
    });
  }

  function imagesHTML(images) {
    if (!Array.isArray(images) || !images.length) return "";
    return `<div class="msg-images" style="display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 0">${images
      .map(
        (src) =>
          `<button type="button" data-image="${esc(src)}" style="padding:0;border:1px solid var(--border);border-radius:14px;overflow:hidden;line-height:0;background:var(--surface-2);cursor:zoom-in"><img src="${esc(
            src
          )}" alt="Generated image" style="display:block;width:min(320px,100%);height:auto" loading="lazy"></button>`
      )
      .join("")}</div>`;
  }

  function messageHTML(message, index) {
    if (message.role === "user") {
      return `<article class="msg msg-user" data-msg-index="${index}"><div class="bubble">${esc(
        message.content
      )}</div></article>`;
    }
    const feedback = message.feedback || "";
    return `<article class="msg msg-assistant" data-msg-index="${index}">
      <div class="msg-body">
        <div class="prose">${markdown(message.content)}</div>
        ${imagesHTML(message.images)}
        <div class="msg-actions"${message.content || (message.images || []).length ? "" : " hidden"}>
          <button type="button" data-action="copy" aria-label="${esc(A.copy)}" data-icon="copy"></button>
          <button type="button" data-action="up" aria-label="${esc(A.goodResponse)}" aria-pressed="${
            feedback === "up"
          }" class="${feedback === "up" ? "is-on" : ""}" data-icon="thumb-up"></button>
          <button type="button" data-action="down" aria-label="${esc(A.badResponse)}" aria-pressed="${
            feedback === "down"
          }" class="${feedback === "down" ? "is-on" : ""}" data-icon="thumb-down"></button>
          <button type="button" data-action="speak" aria-label="Read aloud" data-icon="volume"></button>
          <button type="button" data-action="share" aria-label="Share" data-icon="share"></button>
          <button type="button" data-action="more" aria-label="More" data-icon="more"></button>
        </div>
      </div>
    </article>`;
  }

  function chatLink(chat) {
    return `${window.location.origin}${window.location.pathname}#/c/${chat.id}`;
  }

  async function shareChat(chat) {
    if (!chat) return;
    if (chat.id === "temp") {
      toast("Temporary chats can’t be shared.");
      return;
    }
    const ok = await copyText(chatLink(chat));
    toast(ok ? T.linkCopied : T.copyFailed);
  }

  function renderConversation(id) {
    const chat = ChatStore.get(id);
    if (!chat) {
      if (id === "temp") {
        renderHome(true);
        return;
      }
      window.location.hash = "#/";
      return;
    }
    document.title = chat.title || "ChatGPT";

    view.innerHTML = `<div class="chat-view">
      <header class="chat-top">
        <button class="chat-title" type="button" id="chat-title-btn">${esc(chat.title)}<span data-icon="chevron-down"></span></button>
        <button class="chat-icon" type="button" id="chat-share-btn" aria-label="Share chat" data-icon="share"></button>
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

    const titleBtn = document.getElementById("chat-title-btn");
    titleBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      showPopover(titleBtn, [
        {
          label: M.rename,
          icon: "pencil",
          onSelect: () => {
            const next = window.prompt(A.prompts.renameChat, chat.title);
            if (next === null || !next.trim()) return;
            ChatStore.rename(chat.id, next.trim());
            renderChatList();
            renderConversation(chat.id);
            toast(T.renamed);
          },
        },
        { label: M.share, icon: "share", onSelect: () => shareChat(chat) },
        "-",
        {
          label: M.delete,
          icon: "trash",
          danger: true,
          onSelect: () => {
            ChatStore.remove(chat.id);
            state.convId = null;
            window.location.hash = "#/";
            renderChatList();
            renderProjectList();
            toast(T.deleted);
          },
        },
      ]);
    });

    document.getElementById("chat-share-btn").addEventListener("click", () => shareChat(chat));

    const thread = document.getElementById("thread");
    bindMessageActions(thread, chat.id);
    scrollToBottom();
  }

  function createAssistantNode() {
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
    window.hydrateIcons(node);
    return node;
  }

  function bindMessageActions(root, chatId) {
    root.addEventListener("click", (event) => {
      const image = event.target.closest("[data-image]");
      if (image) {
        previewImage(image.dataset.image, null);
        return;
      }
      const button = event.target.closest(".msg-actions button[data-action]");
      if (!button) return;
      const article = button.closest(".msg");
      const index = Number(article?.dataset.msgIndex ?? -1);
      const action = button.dataset.action;
      const chat = ChatStore.get(chatId);
      const message = chat && chat.messages[index];
      if (!message) return;

      if (action === "copy") {
        const text = article.querySelector(".prose")?.innerText || message.content || "";
        copyText(text).then((ok) => {
          if (!ok) return toast(T.copyFailed);
          button.classList.add("is-on");
          button.setAttribute("aria-label", A.copied);
          toast(T.copied);
          setTimeout(() => button.classList.remove("is-on"), 1200);
        });
        return;
      }
      if (action === "up" || action === "down") {
        const next = message.feedback === action ? null : action;
        ChatStore.updateMessage(chatId, index, { feedback: next });
        const group = button.parentElement;
        group.querySelectorAll('[data-action="up"], [data-action="down"]').forEach((sibling) => {
          const active = sibling.dataset.action === next;
          sibling.classList.toggle("is-on", active);
          sibling.setAttribute("aria-pressed", String(active));
        });
        return;
      }
      if (action === "speak") {
        Speech.toggle(article.querySelector(".prose")?.innerText || message.content, button);
        return;
      }
      if (action === "share") {
        shareChat(chat);
        return;
      }
      if (action === "more") {
        event.stopPropagation();
        let lastAssistant = -1;
        chat.messages.forEach((entry, position) => {
          if (entry.role === "assistant") lastAssistant = position;
        });
        showPopover(button, [
          ...(index === lastAssistant
            ? [
                {
                  label: M.retry,
                  icon: "new-chat",
                  onSelect: () => retryMessage(chatId, index),
                },
              ]
            : []),
          {
            label: A.copy,
            icon: "copy",
            onSelect: () => {
              copyText(article.querySelector(".prose")?.innerText || message.content || "").then((ok) =>
                toast(ok ? T.copied : T.copyFailed)
              );
            },
          },
          {
            label: M.readAloud,
            icon: "volume",
            onSelect: () => Speech.toggle(article.querySelector(".prose")?.innerText || message.content),
          },
          { label: M.copyLink, icon: "link", onSelect: () => shareChat(chat) },
        ]);
      }
    });
  }

  function scrollToBottom() {
    const box = document.getElementById("thread-scroll");
    if (box) box.scrollTop = box.scrollHeight;
  }

  function retryMessage(chatId, index) {
    if (state.streaming) return;
    const chat = ChatStore.get(chatId);
    if (!chat) return;
    const history = chat.messages.slice(0, index);
    if (!history.length) return;
    ChatStore.replaceMessages(chatId, history);
    renderConversation(chatId);
    const thread = document.getElementById("thread");
    const node = createAssistantNode();
    thread.append(node);
    window.hydrateIcons(node);
    generateReply(chatId, node);
  }

  function previewImage(src, imageId) {
    const actions = [
      {
        label: M.download,
        icon: "download",
        primary: true,
        close: false,
        onSelect: () => downloadFile(src.split("/").pop() || "image.png", { url: src }),
      },
    ];
    if (imageId) {
      actions.push({
        label: M.remove,
        danger: true,
        onSelect: () => {
          ImagesStore.remove(imageId);
          if (window.location.hash.startsWith("#/images")) renderImages();
        },
      });
    }
    actions.push({ label: M.close });
    showModal({
      title: "Image",
      body: `<img src="${esc(src)}" alt="Generated image" style="width:100%;border-radius:14px;display:block" />`,
      actions,
    });
  }

  /* ------------------------------------------------------------- gpt helpers */
  function openGpt(item) {
    state.temp = false;
    state.tempChat = null;
    const chat = ChatStore.create(item.name, {
      system: `You are “${item.name}”. ${item.desc || ""}${item.by ? ` Created by ${item.by}.` : ""}`,
    });
    ChatStore.addMessage(chat.id, {
      role: "assistant",
      content: `You are now chatting with **${item.name}**.\n\n${item.desc || ""}${item.by ? `\n\nBy ${item.by}.` : ""}`,
    });
    state.convId = chat.id;
    window.location.hash = `#/c/${chat.id}`;
  }

  function createGptFlow() {
    const name = window.prompt(A.prompts.newGptName, "");
    if (!name || !name.trim()) return;
    const desc = window.prompt(A.prompts.newGptDescription, "");
    if (desc === null) return;
    const gpt = { name: name.trim(), desc: desc.trim(), by: Profile.get().name, mark: name.trim().charAt(0).toUpperCase() };
    GptStore.add(gpt);
    toast(format(T.gptCreated, { name: gpt.name }));
    if (window.location.hash === "#/my-gpts") renderMyGpts();
    else window.location.hash = "#/my-gpts";
  }

  function gptCard(item) {
    return `<button class="gpt-card" type="button" data-gpt="${esc(
      JSON.stringify({ name: item.name, desc: item.desc || "", by: item.by || "You" })
    )}">
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
          (item) =>
            !q ||
            item.name.toLowerCase().includes(q) ||
            item.desc.toLowerCase().includes(q) ||
            item.by.toLowerCase().includes(q)
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
    const sections = cat ? [{ title: cat.title, subtitle: cat.subtitle, items: cat.items }] : A.gpts.sections;

    view.innerHTML = `<div class="page-scroll gpts-view">
      <div class="gpts-top">
        <a href="#/my-gpts" class="quiet-link">${esc(A.gpts.myGpts)}</a>
        <button class="create-btn" type="button" data-create-gpt><span data-icon="plus"></span>${esc(A.gpts.create)}</button>
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
        else (document.querySelector(".page-scroll") || view).scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function renderMyGpts() {
    const gpts = GptStore.all();
    const cards = gpts
      .map((gpt) =>
        gptCard({ name: gpt.name, desc: gpt.desc || "Your custom GPT.", by: gpt.by || "You", mark: gpt.mark || "G" })
      )
      .join("");
    view.innerHTML = `<div class="page-scroll gpts-view">
      <div class="gpts-top">
        <a href="#/gpts" class="quiet-link">${esc(A.myGpts.explore)}</a>
        <button class="create-btn" type="button" data-create-gpt><span data-icon="plus"></span>${esc(A.gpts.create)}</button>
      </div>
      <div class="gpts-inner">
        <h1>${esc(A.myGpts.title)}</h1>
        <p class="page-sub">${esc(A.myGpts.subtitle)}</p>
        <div class="gpt-tabs" role="tablist">
          <button class="gpt-tab is-active" type="button" id="my-gpts-tab">${esc(A.myGpts.tabs[0])}</button>
          <button class="gpt-tab" type="button" id="create-tab">${esc(A.myGpts.tabs[1])}</button>
        </div>
        ${
          gpts.length
            ? `<div class="gpt-grid" style="margin-top:22px">${cards}</div>`
            : `<div class="empty-state my-gpts-empty">
                <p>${esc(A.myGpts.empty)}</p>
                <button class="create-btn" type="button" data-create-gpt><span data-icon="plus"></span>${esc(
                  A.myGpts.cta
                )}</button>
              </div>`
        }
      </div>
    </div>`;
    window.hydrateIcons(view);
    document.getElementById("create-tab").addEventListener("click", createGptFlow);
  }

  /* ---------------------------------------------------------------- library */
  function libraryFiles() {
    const tab = A.library.tabs[state.libTab] || "All";
    return LibraryStore.all().filter((file) => {
      if (file.blank) return tab === "Suggested" || tab === "All";
      if (tab === "Favorites") return Boolean(file.favorite);
      if (tab === "Images") return file.kind === "image" || Boolean(file.src);
      if (tab === "Folders") return false;
      if (state.libFilter !== "All" && file.kind !== state.libFilter) return false;
      return true;
    });
  }

  function fileIcon(kind) {
    return { pdf: "file", globe: "globe", doc: "file", image: "images", file: "file" }[kind] || "file";
  }

  function renderLibrary() {
    view.innerHTML = `<div class="page-scroll library-view">
      <header class="lib-head">
        <h1>${esc(A.library.title)}</h1>
        <div class="lib-tools">
          <button class="tool-btn" type="button" id="lib-list" aria-label="List view" data-icon="listw"></button>
          <button class="tool-btn is-on" type="button" id="lib-grid-btn" aria-label="Grid view" data-icon="grid"></button>
          <div class="search-box lib-search"><span data-icon="search"></span><input id="library-search" type="search" placeholder="${esc(
            A.library.searchPlaceholder
          )}" /></div>
          <button class="new-btn" type="button" id="library-new">${esc(
            A.library.newLabel
          )}<span data-icon="chevron-down"></span></button>
          <button class="tool-btn" type="button" id="library-filter" aria-label="Filter" data-icon="sliders"></button>
        </div>
      </header>
      <div class="lib-tabs" role="tablist">
        ${A.library.tabs
          .map(
            (label, index) =>
              `<button class="lib-tab${index === state.libTab ? " is-active" : ""}" type="button" role="tab" aria-selected="${
                index === state.libTab
              }" data-tab="${index}">${esc(label)}</button>`
          )
          .join("")}
      </div>
      <div class="lib-grid" id="lib-grid"></div>
    </div>`;

    window.hydrateIcons(view);
    const grid = document.getElementById("lib-grid");
    const input = document.getElementById("library-search");
    const listBtn = document.getElementById("lib-list");
    const gridBtn = document.getElementById("lib-grid-btn");

    const applyView = () => {
      grid.style.gridTemplateColumns = state.libView === "list" ? "1fr" : "";
      listBtn.classList.toggle("is-on", state.libView === "list");
      gridBtn.classList.toggle("is-on", state.libView === "grid");
    };

    const draw = (query) => {
      const q = query.trim().toLowerCase();
      const files = libraryFiles().filter((file) => {
        if (!q) return true;
        if (file.blank) return false;
        return String(file.name || "").toLowerCase().includes(q);
      });
      if (!files.length) {
        grid.innerHTML = `<p class="page-empty">No files here yet. Use New to add one.</p>`;
        return;
      }
      grid.innerHTML = files
        .map((file) => {
          if (file.blank) return `<div class="lib-card is-blank"></div>`;
          return `<button class="lib-card" type="button" data-file="${esc(file.id)}">
            <span class="lib-card-head"><span class="file-ico ${esc(file.kind)}" data-icon="${fileIcon(
            file.kind
          )}"></span><span class="lib-name">${esc(file.name)}</span></span>
            <span class="lib-card-body">${
              file.src
                ? `<img src="${esc(file.src)}" alt="" style="max-width:100%;max-height:100%;object-fit:cover" />`
                : `<span class="file-big ${esc(file.kind)}" data-icon="${fileIcon(file.kind)}"></span>`
            }</span>
          </button>`;
        })
        .join("");
      window.hydrateIcons(grid);
    };

    input.addEventListener("input", () => draw(input.value));
    view.querySelectorAll("[data-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.libTab = Number(tab.dataset.tab);
        view.querySelectorAll("[data-tab]").forEach((other) => {
          const active = other === tab;
          other.classList.toggle("is-active", active);
          other.setAttribute("aria-selected", String(active));
        });
        draw(input.value);
      });
    });

    listBtn.addEventListener("click", () => {
      state.libView = "list";
      applyView();
    });
    gridBtn.addEventListener("click", () => {
      state.libView = "grid";
      applyView();
    });

    document.getElementById("library-filter").addEventListener("click", (event) => {
      event.stopPropagation();
      const anchor = event.currentTarget;
      showPopover(anchor, ["All", "pdf", "globe", "image", "doc", "file"].map((kind) => ({
        label: kind === "All" ? "All files" : kind === "globe" ? "Web pages" : kind === "image" ? "Images" : kind.toUpperCase(),
        icon: kind === "All" ? "filter" : fileIcon(kind),
        onSelect: () => {
          state.libFilter = kind;
          draw(input.value);
          toast(`Filter: ${kind === "All" ? "All files" : kind}`);
        },
      })));
    });

    document.getElementById("library-new").addEventListener("click", async (event) => {
      event.stopPropagation();
      const anchor = event.currentTarget;
      showPopover(anchor, [
        {
          label: "Upload files",
          icon: "plus",
          onSelect: async () => {
            const files = await pickFiles("", true);
            for (const file of files) {
              const entry = { name: file.name, kind: /\.(png|jpe?g|gif|webp)$/i.test(file.name) ? "image" : /\.(html?|js|ts)$/i.test(file.name) ? "globe" : /\.pdf$/i.test(file.name) ? "pdf" : "doc" };
              if (file.type.startsWith("image/") && file.size < 1.5 * 1024 * 1024) {
                entry.src = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = () => resolve("");
                  reader.readAsDataURL(file);
                });
              } else if (file.size < 200 * 1024) {
                try {
                  entry.text = await file.text();
                } catch (err) {
                  /* metadata only */
                }
              }
              LibraryStore.add(entry);
            }
            renderLibrary();
            toast("Library updated.");
          },
        },
        {
          label: "New chat",
          icon: "new-chat",
          onSelect: () => {
            window.location.hash = "#/";
          },
        },
      ]);
    });

    grid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-file]");
      if (!card) return;
      const file = LibraryStore.all().find((item) => item.id === card.dataset.file);
      if (file) openLibraryFile(file);
    });

    applyView();
    draw("");
  }

  function openLibraryFile(file) {
    const body = file.src
      ? `<img src="${esc(file.src)}" alt="${esc(file.name)}" style="width:100%;border-radius:14px;display:block" />`
      : `<p style="margin:0 0 10px"><strong style="color:var(--text)">${esc(file.name)}</strong></p>
         <p style="margin:0 0 10px">${esc(file.kind.toUpperCase())} · added ${esc(fmtDate(file.at))}</p>
         ${
           file.text
             ? `<pre style="max-height:220px;overflow:auto;background:var(--surface-2);padding:12px;border-radius:10px;white-space:pre-wrap;font-size:12px">${esc(
                 file.text.slice(0, 4000)
               )}</pre>`
             : `<p style="margin:0">This file is listed in your library. Its contents aren’t stored in this local replica.</p>`
         }`;
    showModal({
      title: file.name,
      body,
      actions: [
        {
          label: file.favorite ? M.unfavorite : M.favorite,
          icon: "check",
          onSelect: () => {
            LibraryStore.update(file.id, { favorite: !file.favorite });
            toast(file.favorite ? T.favoriteRemoved : T.favoriteAdded);
            if (window.location.hash.startsWith("#/library")) renderLibrary();
          },
        },
        {
          label: M.download,
          icon: "download",
          primary: true,
          onSelect: () =>
            file.src
              ? downloadFile(file.name, { url: file.src })
              : file.text
              ? downloadFile(file.name, { text: file.text })
              : toast(T.copyFailed),
        },
        {
          label: M.remove,
          icon: "trash",
          danger: true,
          onSelect: () => {
            LibraryStore.remove(file.id);
            if (window.location.hash.startsWith("#/library")) renderLibrary();
          },
        },
        { label: M.close },
      ],
    });
  }

  /* -------------------------------------------------------------- scheduled */
  function renderScheduled() {
    const tasks = ScheduledStore.all();
    const active = state.schedFilter === "Active";
    const showTasks = active && tasks.length > 0;
    const rows = showTasks ? tasks : A.scheduled.items;

    view.innerHTML = `<div class="page-scroll">
      <div class="page-narrow scheduled-view">
        <div class="sched-head">
          <div>
            <h1>${esc(A.scheduled.title)}</h1>
            <p class="page-sub">${esc(A.scheduled.subtitle)}</p>
          </div>
          <button class="filter-pill" type="button" id="sched-filter"><span data-icon="filter"></span>${esc(
            active ? "Active" : "All"
          )}</button>
        </div>
        ${composerHTML("scheduled", A.scheduled.placeholder)}
        <div class="sched-list">
          <button class="sched-group" type="button"><span>${esc(
            showTasks ? "Active" : A.scheduled.recommended
          )}</span><span data-icon="chevron-down"></span></button>
          ${
            showTasks
              ? tasks
                  .map(
                    (task) => `<div class="sched-row" data-task="${esc(task.id)}">
                      <span class="sched-emoji">${esc(task.emoji || "⏰")}</span>
                      <div class="sched-copy"><strong>${esc(task.title)}</strong><p>${esc(task.desc)}</p></div>
                      <button class="sched-add" type="button" aria-label="Remove ${esc(
                        task.title
                      )}" data-remove-task="${esc(task.id)}" data-icon="trash"></button>
                    </div>`
                  )
                  .join("")
              : A.scheduled.items
                  .map(
                    (item) => `<div class="sched-row" data-title="${esc(item.title)}" data-desc="${esc(item.desc)}">
                      <span class="sched-emoji">${esc(item.emoji)}</span>
                      <div class="sched-copy"><strong>${esc(item.title)}</strong><p>${esc(item.desc)}</p></div>
                      <button class="sched-add" type="button" aria-label="Add ${esc(
                        item.title
                      )}" data-icon="plus"></button>
                    </div>`
                  )
                  .join("")
          }
        </div>
      </div>
    </div>`;
    window.hydrateIcons(view);

    bindComposer(view, "scheduled", {
      onSubmit: (text) => {
        ScheduledStore.add({ title: titleFrom(text), desc: text, emoji: "⏰" });
        state.schedFilter = "Active";
        renderScheduled();
        toast(T.scheduledAdded);
      },
    });

    document.getElementById("sched-filter").addEventListener("click", () => {
      state.schedFilter = state.schedFilter === "Active" ? "All" : "Active";
      renderScheduled();
    });

    const group = view.querySelector(".sched-group");
    group.addEventListener("click", () => {
      const list = view.querySelector(".sched-list");
      const rowsBox = [...list.children].slice(1);
      const hide = rowsBox[0] && !rowsBox[0].hidden;
      rowsBox.forEach((row) => {
        row.hidden = hide;
      });
      const chevron = group.querySelector('[data-icon="chevron-down"]');
      if (chevron) chevron.style.transform = hide ? "rotate(-90deg)" : "";
    });

    view.querySelectorAll(".sched-row").forEach((row) => {
      row.addEventListener("click", (event) => {
        const remove = event.target.closest("[data-remove-task]");
        if (remove) {
          ScheduledStore.remove(remove.dataset.removeTask);
          renderScheduled();
          toast(T.scheduledRemoved);
          return;
        }
        const add = event.target.closest(".sched-add");
        if (add) {
          const title = row.dataset.title;
          const desc = row.dataset.desc;
          if (!title) return;
          const exists = ScheduledStore.all().some((task) => task.title === title);
          if (exists) {
            toast("Already scheduled.");
            return;
          }
          ScheduledStore.add({ title, desc, emoji: row.querySelector(".sched-emoji")?.textContent || "⏰" });
          row.classList.add("is-added");
          toast(T.scheduledAdded);
          return;
        }
        const title = row.querySelector("strong")?.textContent || row.dataset.title;
        state.draft = title;
        window.location.hash = "#/";
      });
    });
  }

  /* ---------------------------------------------------------------- plugins */
  function installedTilesHTML(kind) {
    const names = kind === "skill" ? PluginStore.skills() : PluginStore.plugins();
    const catalog = pluginCatalog();
    if (!names.length) return `<p class="page-sub" style="margin:0">Nothing installed yet.</p>`;
    return names
      .map((name) => {
        const item = catalog.get(name) || { name, mark: name.charAt(0), tone: "plain" };
        return `<span class="app-tile lg tone-${esc(item.tone || "plain")}" title="${esc(name)}" data-installed="${esc(
          name
        )}"><span>${esc(item.mark || name.charAt(0))}</span></span>`;
      })
      .join("");
  }

  function pluginActionHTML(item, kind) {
    const installed = PluginStore.installed(kind, item.name);
    if (installed) {
      return `<button class="plugin-action" type="button" aria-label="Remove ${esc(
        item.name
      )}" data-plugin-toggle="${esc(item.name)}" data-icon="check"></button>`;
    }
    if (item.action === "info" || item.action === "more" || kind === "skill") {
      return `<button class="plugin-action" type="button" aria-label="About ${esc(
        item.name
      )}" data-plugin-info="${esc(item.name)}" data-icon="${
        item.action === "more" ? "more" : "info"
      }"></button>`;
    }
    return `<button class="plugin-action" type="button" aria-label="Add ${esc(
      item.name
    )}" data-plugin-toggle="${esc(item.name)}" data-icon="plus"></button>`;
  }

  function pluginSectionsHTML(kind) {
    const source = kind === "skill" ? A.skills.sections : A.plugins.sections;
    return source
      .map(
        (section) => `<section class="plugin-section">
          <button class="plugin-group" type="button">${esc(section.title)}<span data-icon="chevron-right"></span></button>
          <div class="plugin-grid2">
            ${section.items
              .map(
                (item) => `<div class="plugin-row">
                  ${tile(item, "lg")}
                  <div class="plugin-copy"><strong>${esc(item.name)}</strong><p>${esc(item.desc)}</p></div>
                  ${pluginActionHTML(item, kind)}
                </div>`
              )
              .join("")}
          </div>
        </section>`
      )
      .join("");
  }

  function togglePlugin(name, kind) {
    const added = PluginStore.toggle(kind, name);
    if (kind === "skill") renderSkills();
    else renderPlugins();
    toast(
      format(added ? (kind === "skill" ? T.skillAdded : T.pluginAdded) : kind === "skill" ? T.skillRemoved : T.pluginRemoved, {
        name,
      })
    );
  }

  function showPluginInfo(name, kind) {
    const catalog = pluginCatalog();
    const item = catalog.get(name) || { name, desc: "" };
    const installed = PluginStore.installed(kind, name);
    showModal({
      title: item.name,
      body: `<p style="margin:0">${esc(item.desc || "No description.")}</p>`,
      actions: [
        {
          label: installed ? "Remove" : "Add",
          primary: true,
          onSelect: () => togglePlugin(name, kind),
        },
        { label: M.close },
      ],
    });
  }

  function bindPluginPage(kind) {
    const searchId = kind === "skill" ? "skill-search" : "plugin-search";
    const search = document.getElementById(searchId);
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      view.querySelectorAll(".plugin-row").forEach((row) => {
        row.hidden = Boolean(q) && !row.textContent.toLowerCase().includes(q);
      });
    });

    const settingsBtn = view.querySelector('.plugins-actions .tool-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        window.location.hash = "#/settings/integrations";
      });
    }
    const addBtn = view.querySelector(".add-btn");
    if (addBtn) {
      addBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        showPopover(addBtn, [
          { label: M.browsePlugins, icon: "plugins", onSelect: () => window.location.hash === "#/plugins" ? renderPlugins() : (window.location.hash = "#/plugins") },
          { label: M.browseSkills, icon: "explore", onSelect: () => installSkillsPage() },
        ]);
      });
    }
    const publicPill = view.querySelector(".public-pill");
    if (publicPill) {
      const isPublic = Prefs.get("publicPlugins", true);
      publicPill.textContent = isPublic ? A.plugins.publicLabel : "Private";
      publicPill.addEventListener("click", () => {
        const next = !Prefs.get("publicPlugins", true);
        Prefs.set("publicPlugins", next);
        publicPill.textContent = next ? A.plugins.publicLabel : "Private";
        toast(next ? "Plugin list is public." : "Plugin list is private.");
      });
    }
  }

  function installSkillsPage() {
    if (window.location.hash.startsWith("#/plugins")) renderSkills();
    else window.location.hash = "#/plugins/skills";
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
          <button class="plugin-group" type="button">${esc(
            A.plugins.installedLabel
          )}<span data-icon="chevron-right"></span></button>
          <div class="installed-row">${installedTilesHTML("plugin")}</div>
          <button class="public-pill" type="button">${esc(A.plugins.publicLabel)}</button>
        </section>
        <div id="plugin-sections">${pluginSectionsHTML("plugin")}</div>
      </div>
    </div>`;
    window.hydrateIcons(view);
    bindPluginPage("plugin");
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
        <section class="plugin-section installed">
          <button class="plugin-group" type="button">${esc(
            A.plugins.installedLabel
          )}<span data-icon="chevron-right"></span></button>
          <div class="installed-row">${installedTilesHTML("skill")}</div>
        </section>
        ${pluginSectionsHTML("skill")}
      </div>
    </div>`;
    window.hydrateIcons(view);
    bindPluginPage("skill");
  }

  /* --------------------------------------------------------------- projects */
  function renderProjects() {
    const projects = ProjectStore.all();
    view.innerHTML = `<div class="page-scroll projects-view">
      <header class="projects-head">
        <h1>${esc(A.projects.title)}</h1>
        <div class="projects-actions">
          <div class="search-box projects-search"><span data-icon="search"></span><input id="project-search" type="search" placeholder="${esc(
            A.projects.searchPlaceholder
          )}" /></div>
          <button class="create-btn" type="button" data-create-project><span data-icon="plus"></span>${esc(
            A.projects.create
          )}</button>
        </div>
      </header>
      <div class="projects-table">
        <div class="projects-cols"><span>${esc(A.projects.headers[0])}</span><span>${esc(
      A.projects.headers[1]
    )}<span data-icon="arrow-down"></span></span></div>
        <div id="project-rows">
          ${
            projects.length
              ? projects
                  .map(
                    (project) => `<button class="projects-row" type="button" data-project-open="${esc(
                      project.id
                    )}"><span data-icon="folder-plus"></span>${esc(project.name)}<span style="margin-left:auto;color:var(--muted);font-size:13px">${esc(
                      fmtDate(project.updatedAt)
                    )}</span></button>`
                  )
                  .join("")
              : `<p class="page-empty" id="projects-empty">No projects yet. Create one to group related chats.</p>`
          }
        </div>
        <button class="projects-row" type="button" id="locked-chats"><span data-icon="lock"></span>${esc(
          A.projects.locked
        )}</button>
      </div>
    </div>`;
    window.hydrateIcons(view);

    const search = document.getElementById("project-search");
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll("[data-project-open]").forEach((row) => {
        row.hidden = Boolean(q) && !row.textContent.toLowerCase().includes(q);
      });
    });

    document.getElementById("project-rows").addEventListener("click", (event) => {
      const row = event.target.closest("[data-project-open]");
      if (!row) return;
      const project = ProjectStore.all().find((item) => item.id === row.dataset.projectOpen);
      if (project) openProject(project);
    });

    document.getElementById("locked-chats").addEventListener("click", () => {
      const locked = ChatStore.all().filter((chat) => chat.locked);
      if (!locked.length) {
        toast(T.noLockedChats);
        return;
      }
      window.location.hash = `#/c/${locked[0].id}`;
    });
  }

  /* --------------------------------------------------------------- settings */
  const PROFILE_LABEL = (() => {
    const item = A.settings.nav.flatMap((group) => group.items).find((entry) => entry.icon === "avatar");
    return item ? item.label : "Profile";
  })();

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
                )}"><span class="avatar tiny">${esc(
                  initialsOf(Profile.get().name, session.email)
                )}</span><span>${esc(item.label)}</span><span data-icon="arrow-up-right"></span></button>`;
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

  function valueButton(section, label, value) {
    return `<button type="button" data-setting="${esc(section)}" data-label="${esc(
      label
    )}" data-value="${esc(value)}" style="font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:right">${esc(
      value
    )}</button>`;
  }

  function settingsRowsHTML(section, rows) {
    return rows
      .map((row) => {
        const value = SettingsStore.get(section, row.label, row.value);
        return `<div class="settings-row">
          <div><strong>${esc(row.label)}</strong><p>${esc(row.desc)}</p></div>
          <div class="settings-value">${valueButton(section, row.label, value)}${
            row.edit
              ? `<button class="edit-btn" type="button" aria-label="Edit ${esc(
                  row.label
                )}" data-setting="${esc(section)}" data-label="${esc(row.label)}" data-icon="pencil"></button>`
              : ""
          }</div>
        </div>`;
      })
      .join("");
  }

  function settingsPaneHTML(label) {
    const profile = Profile.get();
    const back = `<a class="mobile-back" href="#/" data-icon="arrow-left">${esc(A.settings.back)}</a>`;

    if (label === "Account" || label === PROFILE_LABEL) {
      const acc = A.settings.account;
      const isProfile = label === PROFILE_LABEL;
      const rows = [
        {
          label: "Name",
          desc: acc.rows.find((row) => row.label === "Name")?.desc || "The name associated with your account",
          value: profile.name,
          edit: true,
        },
        {
          label: "Username",
          desc: acc.rows.find((row) => row.label === "Username")?.desc || "Your unique handle",
          value: profile.username,
          edit: true,
        },
        {
          label: "Email",
          desc: acc.rows.find((row) => row.label === "Email")?.desc || "The email address linked to your account",
          value: session.email,
          edit: true,
        },
        {
          label: "Plan",
          desc: acc.rows.find((row) => row.label === "Plan")?.desc || "The plan for your current workspace",
          value: profile.plan,
          edit: true,
        },
        {
          label: "Age",
          desc: acc.rows.find((row) => row.label === "Age")?.desc || "The age range used to apply account protections",
          value: SettingsStore.get("Account", "Age", acc.age),
          edit: true,
        },
      ];
      return `<div class="settings-pane">
        ${back}
        <h1>${esc(isProfile ? profile.name : acc.title)}</h1>
        <p class="page-sub">${esc(isProfile ? "Your public profile in this workspace." : acc.subtitle)}</p>
        <section class="settings-details">
          <h2>${esc(acc.details)}</h2>
          ${settingsRowsHTML("Account", rows)}
        </section>
        <section class="settings-details gpt-profile">
          <h2>GPT builder profile</h2>
          <div class="settings-row">
            <div><strong class="sr-only">GPT builder profile</strong><p>The display name on your GPT builder profile</p></div>
            <div class="settings-value">${valueButton("Account", "GPT builder profile", profile.gptProfile)}<button class="edit-btn" type="button" aria-label="Edit GPT builder profile" data-setting="Account" data-label="GPT builder profile" data-icon="pencil"></button></div>
          </div>
        </section>
        ${
          isProfile
            ? ""
            : `<section class="settings-details delete-account">
                <h2 class="sr-only">Delete account</h2>
                <div class="settings-row">
                  <div><strong>${esc(acc.deleteTitle)}</strong><p>${esc(acc.deleteBody)}</p></div>
                  <button class="delete-btn" type="button" id="delete-account">${esc(acc.deleteCta)}</button>
                </div>
              </section>`
        }
      </div>`;
    }

    const pane = A.settings.panes[label] || {
      subtitle: `Manage ${label.toLowerCase()} for your account.`,
      rows: [
        { label: `${label} preferences`, desc: "Saved in this browser for this account.", value: "Default" },
      ],
    };
    return `<div class="settings-pane">
      ${back}
      <h1>${esc(label)}</h1>
      <p class="page-sub">${esc(pane.subtitle)}</p>
      <section class="settings-details">
        <h2>Details</h2>
        ${settingsRowsHTML(label, pane.rows)}
      </section>
    </div>`;
  }

  function refreshSettingsPane() {
    const main = document.getElementById("settings-main");
    if (!main) return;
    main.innerHTML = settingsPaneHTML(state.settingsSection);
    window.hydrateIcons(main);
  }

  function editSetting(section, label, fallbackValue) {
    if (section === "Account") {
      const profile = Profile.get();
      if (label === "Email") {
        toast(T.emailLocked);
        return;
      }
      if (label === "Plan") {
        const plan = window.prompt(A.prompts.editSetting.replace("{label}", label), profile.plan);
        if (plan === null || !plan.trim()) return;
        Profile.set({ plan: plan.trim() });
        renderAccount();
        refreshSettingsPane();
        toast(T.settingSaved);
        return;
      }
      const current =
        label === "GPT builder profile" ? profile.gptProfile : label === "Name" ? profile.name : label === "Username" ? profile.username : SettingsStore.get("Account", label, "");
      const next = window.prompt(format(A.prompts.editSetting, { label }), current);
      if (next === null || !next.trim()) return;
      if (label === "Name") Profile.set({ name: next.trim() });
      else if (label === "Username") Profile.set({ username: next.trim() });
      else if (label === "GPT builder profile") Profile.set({ gptProfile: next.trim() });
      else SettingsStore.set("Account", label, next.trim());
      renderAccount();
      refreshSettingsPane();
      toast(T.settingSaved);
      return;
    }

    const current = SettingsStore.get(section, label, fallbackValue == null ? "Default" : fallbackValue);
    if (current === "On" || current === "Off") {
      const next = current === "On" ? "Off" : "On";
      SettingsStore.set(section, label, next);
      if (section === "Voice" && label === "Spoken replies") Prefs.set("voiceReplies", next === "On");
      if (section === "Plugins" && label === "Public plugin list") Prefs.set("publicPlugins", next === "On");
      refreshSettingsPane();
      toast(T.settingSaved);
      return;
    }
    const next = window.prompt(format(A.prompts.editSetting, { label }), current);
    if (next === null || !next.trim()) return;
    SettingsStore.set(section, label, next.trim());
    refreshSettingsPane();
    toast(T.settingSaved);
  }

  function bindSettingsMain(main) {
    main.addEventListener("click", (event) => {
      const target = event.target.closest("[data-setting]");
      if (target) {
        editSetting(target.dataset.setting, target.dataset.label, target.dataset.value);
        return;
      }
      if (event.target.closest("#delete-account")) {
        if (!window.confirm(A.confirm.deleteAccount)) return;
        Object.values(KEYS).forEach(removeKey);
        removeKey("cg.chats");
        removeKey("cg.pending");
        const accounts = Session.accounts();
        delete accounts[USER];
        Session.saveAccounts(accounts);
        Session.clear();
        window.location.href = "index.html";
      }
    });
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
    bindSettingsMain(main);
  }

  /* ----------------------------------------------------------------- images */
  function renderImages() {
    const images = ImagesStore.all();
    view.innerHTML = `<div class="page-scroll"><div class="page-narrow simple-page">
      <h1>${esc(A.images.title)}</h1>
      <p class="page-sub">${esc(A.images.subtitle)}</p>
      ${
        images.length
          ? `<div class="lib-grid" style="margin-top:22px">${images
              .map(
                (image) => `<button class="lib-card" type="button" data-generated="${esc(image.id)}">
                  <span class="lib-card-body" style="padding:0"><img src="${esc(
                    image.src
                  )}" alt="${esc(image.prompt || "Generated image")}" style="width:100%;height:100%;object-fit:cover;display:block" /></span>
                  <span class="lib-card-head"><span class="lib-name">${esc(image.prompt || "Image")}</span></span>
                </button>`
              )
              .join("")}</div>
              <div style="margin-top:18px"><button class="create-btn" type="button" data-image-create><span data-icon="plus"></span>${esc(
                A.images.cta
              )}</button></div>`
          : `<div class="empty-state"><p>${esc(A.images.empty)}</p><button class="create-btn" type="button" data-image-create>${esc(
              A.images.cta
            )}</button></div>`
      }
    </div></div>`;
    window.hydrateIcons(view);

    view.querySelectorAll("[data-generated]").forEach((card) => {
      card.addEventListener("click", () => {
        const image = ImagesStore.all().find((item) => item.id === card.dataset.generated);
        if (!image) return;
        showModal({
          title: image.prompt || "Image",
          body: `<img src="${esc(image.src)}" alt="" style="width:100%;border-radius:14px;display:block" />`,
          actions: [
            {
              label: M.download,
              icon: "download",
              primary: true,
              onSelect: () => downloadFile(image.src.split("/").pop() || "image.png", { url: image.src }),
            },
            {
              label: M.remove,
              icon: "trash",
              danger: true,
              onSelect: () => {
                ImagesStore.remove(image.id);
                renderImages();
              },
            },
            { label: M.close },
          ],
        });
      });
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
    bindComposer(view, "home", {
      onSubmit: (text) =>
        sendMessage(text, {
          system:
            "You are a deep research assistant. Break the question into steps, investigate systematically, and finish with a clear, sourced-style summary.",
        }),
    });
  }

  /* ---------------------------------------------------------------- replies */
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

  async function streamReply({ messages, system }, onDelta) {
    const controller = new AbortController();
    state.controller = controller;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, system, think: state.think }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.error || "request_failed");
      error.code = data.error;
      error.detail = data.detail;
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

  async function generateReply(chatId, node) {
    const chat = ChatStore.get(chatId);
    if (!chat) return;
    const prose = node.querySelector(".prose");
    prose.innerHTML = typingHTML();
    scrollToBottom();

    const apiMessages = chat.messages.map((message) => ({ role: message.role, content: message.content }));
    let answer = "";
    setStreaming(true);
    try {
      await streamReply({ messages: apiMessages, system: chat.system }, (delta) => {
        if (!answer) prose.innerHTML = "";
        answer += delta;
        prose.innerHTML = markdown(answer);
        scrollToBottom();
      });
      if (!answer.trim()) throw new Error("empty");
      ChatStore.addMessage(chatId, { role: "assistant", content: answer, at: Date.now() });
      node.dataset.msgIndex = String((ChatStore.get(chatId)?.messages.length || 1) - 1);
      const actions = node.querySelector(".msg-actions");
      if (actions) actions.hidden = false;
      if (Prefs.get("voiceReplies", false)) Speech.toggle(answer);
      renderChatList();
    } catch (err) {
      const aborted = err && err.name === "AbortError";
      if (answer.trim()) {
        ChatStore.addMessage(chatId, { role: "assistant", content: answer, at: Date.now() });
        node.dataset.msgIndex = String((ChatStore.get(chatId)?.messages.length || 1) - 1);
        const actions = node.querySelector(".msg-actions");
        if (actions) actions.hidden = false;
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

  function imageRequestFor(text) {
    return /^(please\s+)?(create|generate|make|draw|render)\b[\s\S]{0,60}\b(image|picture|illustration|artwork|photo|logo|wallpaper)\b/i.test(
      text
    );
  }

  async function generateImage(chatId, prompt, node) {
    const prose = node.querySelector(".prose");
    prose.innerHTML = typingHTML();
    const controller = new AbortController();
    state.controller = controller;
    setStreaming(true);
    let created = false;
    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.images) || !data.images.length) {
        const error = new Error(data.error || "image_error");
        error.code = data.error;
        throw error;
      }
      const content = `Here’s the image I created for “${prompt}”.`;
      prose.innerHTML = markdown(content) + imagesHTML(data.images);
      ChatStore.addMessage(chatId, { role: "assistant", content, images: data.images, at: Date.now() });
      node.dataset.msgIndex = String((ChatStore.get(chatId)?.messages.length || 1) - 1);
      data.images.forEach((src) => ImagesStore.add({ src, prompt }));
      const actions = node.querySelector(".msg-actions");
      if (actions) actions.hidden = false;
      scrollToBottom();
      renderChatList();
      toast("Image created.");
      created = true;
      return true;
    } catch (err) {
      if (err.code === "no_image_model") toast(T.imageUnavailable);
      return false;
    } finally {
      state.controller = null;
      setStreaming(false);
      if (!created) prose.innerHTML = "";
    }
  }

  async function sendMessage(text, options = {}) {
    if (state.streaming) return;
    const temp = state.temp;
    let chat = null;

    if (temp) {
      if (!state.tempChat) state.tempChat = ChatStore.create(titleFrom(text));
      chat = state.tempChat;
    } else if (state.convId) {
      chat = ChatStore.get(state.convId);
    }
    if (!chat) {
      chat = ChatStore.create(titleFrom(text), {
        system: options.system || state.pendingSystem || undefined,
        projectId: options.projectId || state.projectId || undefined,
      });
      state.pendingSystem = null;
      state.projectId = null;
      state.convId = chat.id;
      history.replaceState(null, "", `#/c/${chat.id}`);
    }

    ChatStore.addMessage(chat.id, { role: "user", content: text, at: Date.now() });
    renderConversation(chat.id);
    const thread = document.getElementById("thread");
    if (!thread) return;
    const node = createAssistantNode();
    thread.append(node);
    window.hydrateIcons(node);
    scrollToBottom();

    if (imageRequestFor(text)) {
      const made = await generateImage(chat.id, text, node);
      if (made) return;
    }
    await generateReply(chat.id, node);
  }

  /* ------------------------------------------------------------------- boot */
  seedChats();
  renderAccount();
  renderProjectList();
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
