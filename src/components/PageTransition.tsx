"use client";

import { type ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-page-in flex-1 min-h-0 flex flex-col overflow-y-auto">
      {children}
    </div>
  );
}
