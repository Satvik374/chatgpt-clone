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

  /* Social buttons — third-party OAuth is not part of this replica. */
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
        "Third-party sign-in isn't available in this replica. Continue with your email below.";
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
    passwordHint.textContent = C.passwordHint;
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
    const value = emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      emailError.hidden = false;
      emailError.textContent = C.errors.email;
      emailInput.focus();
      return;
    }
    setPasswordStep(value);
  });

  passwordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = passwordInput.value;
    if (isSignup && value.length < 10) {
      passwordError.hidden = false;
      passwordError.textContent = C.errors.password;
      passwordInput.focus();
      return;
    }
    if (!value) {
      passwordError.hidden = false;
      passwordError.textContent = "Enter a password to continue.";
      passwordInput.focus();
      return;
    }
    window.Session.set(activeEmail);
    window.location.href = "app.html";
  });

  back.addEventListener("click", setEmailStep);

  emailInput.value = session?.email || window.CONFIG.demoEmail || "";
  setEmailStep();

  window.hydrateIcons(socialStack);
  document.title = `${title.textContent} - ${window.CONFIG.appName}`;
})();
