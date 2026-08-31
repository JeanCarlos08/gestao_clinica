"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="premium-surface rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">!</div>
        <h2 className="text-lg font-bold text-white mb-2">Ops, algo deu errado</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">{error.message || "Erro inesperado ao carregar esta página."}</p>
        <button onClick={reset} className="btn-primary px-6 py-2.5 text-sm">
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
