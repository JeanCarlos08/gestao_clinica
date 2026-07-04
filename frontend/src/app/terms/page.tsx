"use client";

import Link from "next/link";

const TERMS = `# Termos de Serviço — Clínica IA

Última atualização: 18/05/2026

Bem-vindo à Plataforma Clínica IA. Ao acessar ou usar nossos serviços, você concorda com estes Termos de Serviço e com a nossa Política de Privacidade.

(Resumo público. Consulte docs/TERMS_OF_SERVICE.md para a versão completa.)
`;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-muted)] py-12 px-4">
      <div className="max-w-4xl mx-auto bg-[var(--card)] p-8 rounded-2xl border border-[var(--border)] shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-4">Termos de Serviço</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">Resumo público — consulte o DPO para a versão completa.</p>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">{TERMS}</pre>

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/" className="px-4 py-2 rounded-lg bg-white/[0.04] text-[var(--text-muted)]">Voltar</Link>
          <a href="/docs/TERMS_OF_SERVICE.md" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-[var(--primary)] text-black font-semibold">Ver versão completa</a>
        </div>
      </div>
    </main>
  );
}
