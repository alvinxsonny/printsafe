"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function subscribeSystemTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getSystemThemeSnapshot(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getSystemThemeServerSnapshot(): "light" | "dark" {
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    try {
      const saved = localStorage.getItem("printsafe-theme") as Theme;
      if (
        saved &&
        (saved === "light" || saved === "dark" || saved === "system")
      ) {
        return saved;
      }
    } catch {
      // localStorage may not be accessible in restricted/private browsing modes
    }
    return "system";
  });

  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    getSystemThemeServerSnapshot
  );

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("printsafe-theme", newTheme);
    document.cookie = `printsafe-theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const toggleTheme = () => {
    const next = resolvedTheme === "light" ? "dark" : "light";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
