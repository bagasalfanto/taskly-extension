(() => {
  const STORAGE_KEY = "taskly.theme";
  const LEGACY_STORAGE_KEY = "theme";
  const DARK = "dark";
  const LIGHT = "light";
  const root = document.documentElement;
  const mediaQuery = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  function isValidTheme(theme) {
    return theme === DARK || theme === LIGHT;
  }

  function readSavedTheme() {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY);
      if (isValidTheme(savedTheme)) return savedTheme;

      const legacyTheme = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (isValidTheme(legacyTheme)) {
        localStorage.setItem(STORAGE_KEY, legacyTheme);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return legacyTheme;
      }
    } catch (_error) {
      return null;
    }

    return null;
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_error) {
      // Theme persistence is optional; the UI still works without it.
    }
  }

  function getPreferredTheme() {
    const savedTheme = readSavedTheme();
    if (savedTheme) return savedTheme;
    return mediaQuery && mediaQuery.matches ? DARK : LIGHT;
  }

  function updateToggle(theme) {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    const isDark = theme === DARK;
    toggle.textContent = isDark ? "Light" : "Dark";
    toggle.dataset.themeState = theme;
    toggle.setAttribute(
      "aria-label",
      isDark ? "Aktifkan light mode" : "Aktifkan dark mode"
    );
    toggle.setAttribute(
      "title",
      isDark ? "Aktifkan light mode" : "Aktifkan dark mode"
    );
  }

  function applyTheme(theme) {
    const normalizedTheme = theme === DARK ? DARK : LIGHT;
    root.setAttribute("data-theme", normalizedTheme);
    root.style.colorScheme = normalizedTheme;
    updateToggle(normalizedTheme);
  }

  function attachToggle() {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    updateToggle(root.getAttribute("data-theme") || getPreferredTheme());
    toggle.addEventListener("click", () => {
      const currentTheme =
        root.getAttribute("data-theme") === DARK ? DARK : LIGHT;
      const nextTheme = currentTheme === DARK ? LIGHT : DARK;
      applyTheme(nextTheme);
      saveTheme(nextTheme);
    });
  }

  applyTheme(getPreferredTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachToggle, { once: true });
  } else {
    attachToggle();
  }

  if (mediaQuery && mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", (event) => {
      if (!readSavedTheme()) {
        applyTheme(event.matches ? DARK : LIGHT);
      }
    });
  }
})();
