"use client";

import { type ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-page-in">
      {children}
      <style>{`
        .animate-page-in {
          animation: pageIn 0.15s cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: opacity, transform;
        }
        @keyframes pageIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-page-in { animation: none; }
        }
      `}</style>
    </div>
  );
}
