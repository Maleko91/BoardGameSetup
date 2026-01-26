export type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "theme";

export const getStoredTheme = (): Theme => {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
};

export const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const initializeTheme = () => {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
};
