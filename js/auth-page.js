(function () {
  const C = window.CONTENT.auth;
  const params = new URLSearchParams(window.location.search);
  const isSignup = params.get("mode") === "signup";
  const session = window.Session.get();

  const title = document.getElementById("auth-title");
  const socialWrap = document.getElementById("auth-social");
  const socialStack = document.getElementById("social-stack");
  const emailForm = document.getElementById("email-form");
  const emailInput = document.getElementById("email");
  const emailError = document.getElementById("email-error");
  const passwordForm = document.getElementById("password-form");
  const passwordInput = document.getElementById("password");
  const passwordError = document.getElementById("password-error");
  const passwordHint = document.getElementById("password-hint");
  const alt = document.getElementById("auth-alt");
  const back = document.getElementById("auth-back");
  let step = "email";
  let activeEmail = "";
  let busy = false;

  async function digest(value) {
    try {
      if (window.crypto && crypto.subtle) {
        const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
        return Array.from(new Uint8Array(buffer))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
      }
    } catch (err) {
      /* fall back to a plain marker below */
    }
    return `plain:${value}`;
  }

  /* Social buttons — third-party OAuth is not configured for this local build. */
  C.social.forEach((provider) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "auth-btn";
    if (provider.mark) {
      const mark = document.createElement("span");
      mark.className = "auth-mark";
      mark.textContent = provider.mark;
      button.append(mark);
    } else {
      const icon = document.createElement("span");
      icon.dataset.icon = provider.icon;
      button.append(icon);
    }
    const label = document.createElement("span");
    label.textContent = provider.label;
    button.append(label);
    button.addEventListener("click", () => {
      emailError.hidden = false;
      emailError.textContent =
        "Third-party sign-in needs an OAuth app and isn’t configured here. Continue with your email below.";
    });
    socialStack.append(button);
  });

  function setEmailStep() {
    step = "email";
    title.textContent = isSignup ? C.signupTitle : C.title;
    socialWrap.hidden = false;
    emailForm.hidden = false;
    passwordForm.hidden = true;
    back.hidden = true;
    passwordError.hidden = true;
    emailError.hidden = true;
    alt.hidden = true;
    alt.innerHTML = "";
  }

  function setPasswordStep(email) {
    step = "password";
    activeEmail = email;
    title.textContent = isSignup ? C.signupPasswordTitle : C.passwordTitle;
    socialWrap.hidden = true;
    emailForm.hidden = true;
    passwordForm.hidden = false;
    back.hidden = false;
    passwordError.hidden = true;
    passwordHint.textContent =
      !isSignup && !window.Session.findAccount(email)
        ? "No account yet for this email — the password you enter now will create it."
        : C.passwordHint;
    passwordInput.value = "";
    passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
    alt.hidden = false;
    alt.innerHTML = "";
    const who = document.createElement("span");
    who.textContent = email;
    alt.append(who, " · ");
    const change = document.createElement("a");
    change.href = "#";
    change.textContent = "Change";
    change.addEventListener("click", (event) => {
      event.preventDefault();
      setEmailStep();
    });
    alt.append(change);
    passwordInput.focus();
  }

  emailForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = emailInput.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      emailError.hidden = false;
      emailError.textContent = C.errors.email;
      emailInput.focus();
      return;
    }
    const account = window.Session.findAccount(value);
    if (isSignup && account) {
      emailError.hidden = false;
      emailError.textContent = "An account with this email already exists. Log in instead.";
      emailInput.focus();
      return;
    }
    setPasswordStep(value);
  });

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const value = passwordInput.value;
    if (!value) {
      passwordError.hidden = false;
      passwordError.textContent = "Enter a password to continue.";
      passwordInput.focus();
      return;
    }
    if (isSignup && value.length < 10) {
      passwordError.hidden = false;
      passwordError.textContent = C.errors.password;
      passwordInput.focus();
      return;
    }

    const submit = passwordForm.querySelector('button[type="submit"]');
    busy = true;
    const label = submit ? submit.textContent : "";
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Checking…";
    }

    try {
      const hash = await digest(value);
      const account = window.Session.findAccount(activeEmail);
      if (account) {
        if (account.hash !== hash) {
          passwordError.hidden = false;
          passwordError.textContent = "Incorrect password for this email. Try again.";
          passwordInput.value = "";
          passwordInput.focus();
          return;
        }
      } else {
        await window.Session.createAccount(activeEmail, hash);
      }
      window.Session.set(activeEmail, { name: account ? account.name : "" });
      window.location.href = "app.html";
    } catch (err) {
      passwordError.hidden = false;
      passwordError.textContent = "Something went wrong. Try again.";
    } finally {
      busy = false;
      if (submit) {
        submit.disabled = false;
        submit.textContent = label;
      }
    }
  });

  back.addEventListener("click", setEmailStep);

  document.querySelectorAll(".auth-cookie button").forEach((button) => {
    button.addEventListener("click", () => {
      try {
        localStorage.setItem("cg.cookiePrefs", JSON.stringify({ essential: true, at: Date.now() }));
      } catch (err) {
        /* storage is optional */
      }
      window.alert(
        "This local replica sets no tracking cookies. It only keeps your session, chats and preferences in this browser’s localStorage."
      );
    });
  });

  emailInput.value = session?.email || window.CONFIG.demoEmail || "";
  if (isSignup) {
    emailInput.value = "";
    emailInput.focus();
  }
  setEmailStep();

  window.hydrateIcons(socialStack);
  document.title = `${title.textContent} - ${window.CONFIG.appName}`;
})();
