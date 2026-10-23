"use client";
import EmptyIllustration from "@/components/EmptyIllustration";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center empty-in">
        <div className="empty-float flex justify-center"><EmptyIllustration variant="search" size={110} /></div>
        <h2 className="text-2xl font-bold text-white mt-2 mb-2">Página não encontrada</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">A página que você procura não existe ou foi movida.</p>
        <Link href="/dashboard" className="btn-motion inline-flex items-center gap-2 bg-[var(--primary)] text-black px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:brightness-110">Voltar ao Dashboard</Link>
      </div>
    </div>
  );
}
