"use client";

import { useEffect, useCallback } from "react";

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== key) return;
      if (modifiers.ctrl && !e.ctrlKey && !e.metaKey) return;
      if (modifiers.shift && !e.shiftKey) return;
      if (modifiers.alt && !e.altKey) return;
      e.preventDefault();
      callback();
    },
    [key, callback, modifiers]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
