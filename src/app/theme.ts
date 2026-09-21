export const themes = ["terminal", "cyberpunk", "cosmic"] as const;
export type Theme = (typeof themes)[number];
export function isTheme(value: string | undefined): value is Theme {
  return themes.some((theme) => theme === value);
}
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("zkbytes.theme", theme);
  } catch {
    /* Session-only when storage is unavailable. */
  }
}
