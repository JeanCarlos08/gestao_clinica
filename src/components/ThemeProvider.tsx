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

  // Efeitos por delegação global: ripple nos CTAs e spotlight nos cards.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest?.(".btn-motion, .auth-submit") as HTMLElement | null;
      if (!btn || btn.hasAttribute("disabled")) return;
      const r = btn.getBoundingClientRect();
      const bit = document.createElement("span");
      bit.className = "ripple-bit";
      bit.style.left = `${e.clientX - r.left}px`;
      bit.style.top = `${e.clientY - r.top}px`;
      if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
      btn.appendChild(bit);
      setTimeout(() => bit.remove(), 520);
    };
    let spot: HTMLElement | null = null;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(".premium-surface") as HTMLElement | null;
      if (el !== spot) {
        spot?.classList.remove("is-spot");
        spot = el;
        spot?.classList.add("spot-on", "is-spot");
      }
      if (!spot) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = spot!.getBoundingClientRect();
        spot!.style.setProperty("--mx", `${e.clientX - r.left}px`);
        spot!.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      spot?.classList.remove("is-spot");
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
