"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="premium-surface rounded-2xl p-8 max-w-md w-full text-center empty-in">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400 text-2xl font-black shadow-[0_0_24px_rgba(239,68,68,0.15)]">!</div>
        <h2 className="text-lg font-bold text-white mb-2">Ops, algo deu errado</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6 break-words">{error.message || "Erro inesperado ao carregar esta página."}</p>
        <button onClick={reset} className="btn-primary px-6 py-2.5 text-sm btn-motion">Tentar novamente</button>
      </div>
    </div>
  );
}
