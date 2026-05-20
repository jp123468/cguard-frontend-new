import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

function getInitialTheme(): Theme {
  try {
    // Our own key takes priority
    const stored = localStorage.getItem("cguard-theme");
    if (stored === "dark" || stored === "light") return stored;

    // Migrate legacy HeroUI key (synchronously, before first render)
    const legacy = localStorage.getItem("heroui-theme");
    if (legacy === "dark" || legacy === "light") {
      localStorage.setItem("cguard-theme", legacy);
      localStorage.removeItem("heroui-theme");
      return legacy;
    }

    // Last resort: check actual DOM class (HeroUI script may have set it)
    if (document.documentElement.classList.contains("dark")) return "dark";

    // System preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {}
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // On mount: clean up any remaining heroui key
  useEffect(() => {
    try { localStorage.removeItem("heroui-theme"); } catch {}
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("cguard-theme", t); } catch {}
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
