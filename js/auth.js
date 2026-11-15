/* Session and local accounts for the replica. Accounts live in this browser only: nothing is sent
   to OpenAI or any other server. Passwords are stored as a hash, never as typed. */
(function () {
  const SESSION_KEY = "cg.session";
  const ACCOUNTS_KEY = "cg.accounts";

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* storage may be unavailable */
    }
  }

  const Session = {
    get() {
      return read(SESSION_KEY, null);
    },
    set(email, extra) {
      const clean = String(email || "").trim().toLowerCase();
      const name = (extra && extra.name) || "";
      const initial = (name.match(/[a-z0-9]/i) || clean.match(/[a-z0-9]/i) || ["?"])[0].toUpperCase();
      const session = {
        email: clean,
        name,
        initials: initial,
        plan: "Go",
        since: Date.now(),
      };
      write(SESSION_KEY, session);
      return session;
    },
    clear() {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (err) {
        /* storage may be unavailable */
      }
    },

    accounts() {
      return read(ACCOUNTS_KEY, {});
    },
    saveAccounts(map) {
      write(ACCOUNTS_KEY, map);
    },
    findAccount(email) {
      const key = String(email || "").trim().toLowerCase();
      const accounts = this.accounts();
      return accounts[key] || null;
    },
    async createAccount(email, hash, name) {
      const key = String(email || "").trim().toLowerCase();
      const accounts = this.accounts();
      accounts[key] = { email: key, hash, name: name || "", createdAt: Date.now() };
      this.saveAccounts(accounts);
      return accounts[key];
    },
  };

  window.Session = Session;
})();
