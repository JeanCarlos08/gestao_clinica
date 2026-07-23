"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
      <style>{`
        .animate-page-in {
          animation: pageIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes pageIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
