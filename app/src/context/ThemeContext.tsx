import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "nobs-theme";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  // Dark by default regardless of OS preference — only an explicit choice
  // (stored below once the user picks one) overrides it.
  return stored === "light" ? "light" : "dark";
}

// Pro cosmetic perk: alternate accent colorways layered on top of light/dark
// via index.css's :root.accent-blue / :root.dark.accent-blue etc. — "green"
// means no extra class, the existing default accent.
export type AccentColor = "green" | "blue" | "purple";
const ACCENT_STORAGE_KEY = "nobs-accent";

function getInitialAccent(): AccentColor {
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
  return stored === "blue" || stored === "purple" ? stored : "green";
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [accentColor, setAccentColorState] = useState<AccentColor>(getInitialAccent);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);

    // Keep the browser chrome (address bar / PWA status bar) in sync with
    // the active theme, not just the in-page colors.
    const meta = document.getElementById("theme-color-meta");
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0f0f0f" : "#f8f8f8");
  }, [theme]);

  useEffect(() => {
    for (const cls of ["accent-blue", "accent-purple"]) document.documentElement.classList.remove(cls);
    if (accentColor !== "green") document.documentElement.classList.add(`accent-${accentColor}`);
    localStorage.setItem(ACCENT_STORAGE_KEY, accentColor);
  }, [accentColor]);

  function setTheme(next: Theme) {
    setThemeState(next);
  }

  function toggleTheme() {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function setAccentColor(next: AccentColor) {
    setAccentColorState(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, accentColor, setAccentColor }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider.");
  return ctx;
}
