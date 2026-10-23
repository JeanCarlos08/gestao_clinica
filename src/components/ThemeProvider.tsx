"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const mounted = useRef(false);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") {
      setTheme(attr);
      return;
    }
    const stored = localStorage.getItem("theme");
    const resolved = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    setTheme(resolved as Theme);
  }, []);

  useEffect(() => {
    const bg = localStorage.getItem("app_bg");
    if (bg) document.documentElement.setAttribute("data-bg", bg);
  }, []);

  useEffect(() => {
    const accent = localStorage.getItem("accent");
    if (accent) document.documentElement.setAttribute("data-accent", accent);
  }, []);

  useEffect(() => {
    // escreve apenas em mudanças do usuário; no mount antiflash já definiu o attr
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
