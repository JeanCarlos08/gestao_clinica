"use client";

import { useEffect, useCallback, useRef } from "react";

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const { ctrl = false, shift = false, alt = false } = modifiers;

  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== key) return;
      if (ctrl && !e.ctrlKey && !e.metaKey) return;
      if (shift && !e.shiftKey) return;
      if (alt && !e.altKey) return;
      e.preventDefault();
      callbackRef.current();
    },
    [key, ctrl, shift, alt]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
