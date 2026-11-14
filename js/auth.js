/* Session handling for the local replica. There is no real authentication here: the email is
   kept in localStorage so the app shell can be explored. */
(function () {
  const KEY = "cg.session";

  const Session = {
    get() {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        return null;
      }
    },
    set(email) {
      const session = {
        email,
        initials: (email.match(/[a-z0-9]/i) || ["?"])[0].toUpperCase(),
        plan: "Free",
        since: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(session));
      return session;
    },
    clear() {
      localStorage.removeItem(KEY);
    },
  };

  window.Session = Session;
})();
