"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  docId: string;
  makePublic?: boolean;
  temporaryMinutes?: number;
  onUrlReady?: (url: string) => void;
};

export default function GoogleDocsIframe({ docId, makePublic = false, temporaryMinutes, onUrlReady }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchUrl() {
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, unknown> = { doc_id: docId, make_public: makePublic };
        if (temporaryMinutes) body.temporary_minutes = temporaryMinutes;

        const token = localStorage.getItem("token");
        const res = await fetch("/api/docs/embed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.detail || "Falha ao obter link do documento");
        }
        const j = await res.json();
        const embedUrl = j.embed_url || j.edit_url;
        if (mounted) {
          setUrl(embedUrl);
          onUrlReady?.(embedUrl);
        }
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchUrl();
    return () => { mounted = false; };
  }, [docId, makePublic, temporaryMinutes, onUrlReady]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
        <p className="text-sm text-[var(--text-muted)]">Carregando editor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white mb-1">Não foi possível carregar o documento</p>
          <p className="text-xs text-red-400 max-w-md">{error}</p>
        </div>
        <a
          href={`https://docs.google.com/document/d/${docId}/edit`}
          target="_blank"
          rel="noreferrer noopener"
          className="text-xs font-semibold px-4 py-2 rounded-xl bg-[var(--primary)] text-black hover:opacity-90 transition-opacity"
        >
          Abrir no Google Docs
        </a>
      </div>
    );
  }

  if (!url) return null;

  return (
    <iframe
      title={`GoogleDoc-${docId}`}
      src={url}
      className="w-full h-full border-0"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
      allow="clipboard-write"
    />
  );
}
