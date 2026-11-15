(function () {
  // A signed-in visitor belongs in the app shell, matching the reference redirect.
  if (window.Session && window.Session.get()) {
    window.location.replace("app.html");
    return;
  }

  const CONTENT = window.CONTENT;
  const nav = document.getElementById("home-nav");
  const suggestions = document.getElementById("suggestions");
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");
  const composer = document.getElementById("composer");
  const textarea = document.getElementById("prompt");
  const attachBtn = composer.querySelector('button[aria-label="Add files and more"]');
  const micBtn = composer.querySelector('button[aria-label="Dictate"]');

  // Primary navigation
  CONTENT.home.nav.forEach((item) => {
    const link = document.createElement("a");
    link.className = "nav-item";
    link.href = item.href;
    link.dataset.icon = item.icon;
    link.append(item.label);
    if (item.external) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const ext = document.createElement("span");
      ext.className = "ext";
      ext.dataset.icon = "external-link";
      link.append(ext);
    }
    nav.append(link);
  });

  // Suggestion chips
  CONTENT.home.suggestions.forEach((label) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = label;
    chip.addEventListener("click", () => {
      textarea.value = label;
      autosize();
      textarea.focus();
    });
    suggestions.append(chip);
  });

  function autosize() {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }

  function setPrompt(text) {
    textarea.value = text;
    autosize();
    textarea.dispatchEvent(new Event("input"));
    textarea.focus();
  }

  /* Attach a file by inlining its text, so the prompt survives the sign-in step. */
  function attachFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "text/*,.md,.json,.csv,.js,.ts,.html,.css,.py,.txt,.pdf,image/*";
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 512 * 1024 || /\.(pdf|png|jpe?g|gif|webp)$/i.test(file.name)) {
        setPrompt(`${textarea.value}${textarea.value ? "\n\n" : ""}[Attached file: ${file.name}]`);
        return;
      }
      try {
        const text = await file.text();
        setPrompt(`${textarea.value}${textarea.value ? "\n\n" : ""}[File: ${file.name}]\n${text.slice(0, 20000)}`);
      } catch (err) {
        setPrompt(`${textarea.value}${textarea.value ? "\n\n" : ""}[Attached file: ${file.name}]`);
      }
    });
    input.click();
  }

  function dictate() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      textarea.focus();
      setPrompt(textarea.value);
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
      setPrompt(`${base}${transcript}`);
    };
    recognition.onerror = () => textarea.focus();
    try {
      recognition.start();
      micBtn.classList.add("is-on");
      recognition.onend = () => micBtn.classList.remove("is-on");
    } catch (err) {
      micBtn.classList.remove("is-on");
    }
  }

  textarea.addEventListener("input", autosize);
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  if (attachBtn) attachBtn.addEventListener("click", attachFile);
  if (micBtn) micBtn.addEventListener("click", dictate);

  // Logged-out send: keep the prompt and move to the sign-in step.
  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = textarea.value.trim();
    if (!value) {
      textarea.focus();
      return;
    }
    try {
      localStorage.setItem("cg.pending", value);
    } catch (err) {
      /* storage is optional */
    }
    window.location.href = "auth.html";
  });

  // Sidebar drawer
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

  document.getElementById("open-sidebar")?.addEventListener("click", openSidebar);
  document.getElementById("close-sidebar")?.addEventListener("click", closeSidebar);
  scrim.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });

  window.hydrateIcons(nav);
  window.hydrateIcons(suggestions);
  autosize();
})();
