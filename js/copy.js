(function () {
  const get = (path) => path.split(".").reduce((obj, key) => (obj == null ? undefined : obj[key]), window.CONTENT);

  function bind(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-copy]").forEach((el) => {
      const value = get(el.dataset.copy);
      if (typeof value === "string") el.textContent = value;
    });
    scope.querySelectorAll("[data-copy-placeholder]").forEach((el) => {
      const value = get(el.dataset.copyPlaceholder);
      if (typeof value === "string") el.setAttribute("placeholder", value);
    });
    scope.querySelectorAll("[data-copy-href]").forEach((el) => {
      const value = get(el.dataset.copyHref);
      if (typeof value === "string") el.setAttribute("href", value);
    });
    scope.querySelectorAll("[data-copy-label]").forEach((el) => {
      const value = get(el.dataset.copyLabel);
      if (typeof value === "string") el.setAttribute("aria-label", value);
    });
  }

  window.bindCopy = bind;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bind());
  } else {
    bind();
  }
})();
