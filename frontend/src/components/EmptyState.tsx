"use client";

import EmptyIllustration from "./EmptyIllustration";

type IllustrationVariant = "default" | "appointment" | "document" | "upload" | "report" | "search";

interface EmptyStateProps {
  title?: string;
  message?: string;
  variant?: IllustrationVariant;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title = "Nenhum registro encontrado",
  message = "Não há dados para exibir no momento.",
  variant = "default",
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <EmptyIllustration variant={variant} size={140} />
      <h3 className="text-base font-bold text-white mt-5 mb-1.5">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--primary)] text-black hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(20,184,166,0.3)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
