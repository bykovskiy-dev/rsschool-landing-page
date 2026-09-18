const THEME_KEY = "theme";
const DARK = "dark";
const LIGHT = "light";

const getPreferredTheme = () => {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === DARK || savedTheme === LIGHT) {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
};

const updateToggleState = (theme) => {
  document.querySelectorAll("[data-theme-set]").forEach((button) => {
    const isActive = button.dataset.themeSet === theme;
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const setTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  updateToggleState(theme);
};

const initThemeToggle = () => {
  setTheme(getPreferredTheme());

  document.querySelectorAll("[data-theme-set]").forEach((button) => {
    button.addEventListener("click", () => {
      setTheme(button.dataset.themeSet);
    });
  });
};

initThemeToggle();
