"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ExternalLink, Download, Loader2, AlertCircle,
  Maximize2, Minimize2, RefreshCw, FileText, CheckCircle2,
} from "lucide-react";
import { API as API_BASE } from "@/lib/api";

interface LaudoInfo {
  id: string;
  titulo: string;
  paciente: string;
  tipo: string;
  data: string;
  status: string;
  url: string;
  embed_url: string;
}

export default function LaudoEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [laudo, setLaudo] = useState<LaudoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const API = API_BASE;
  const getToken = () => localStorage.getItem("token");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLaudo = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push("/"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/laudos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      const all: LaudoInfo[] = await res.json();
      const found = all.find((l) => l.id === id);
      if (!found) throw new Error("Laudo não encontrado.");
      setLaudo(found);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar laudo.");
    } finally {
      setLoading(false);
    }
  }, [id, router, API]);

  useEffect(() => { fetchLaudo(); }, [fetchLaudo]);

  const downloadPdf = async () => {
    if (!laudo) return;
    const token = getToken();
    if (!token) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API}/laudos/${laudo.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao exportar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laudo_${laudo.paciente.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("success", "PDF exportado com sucesso!");
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Falha ao exportar PDF.");
    } finally {
      setDownloading(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--text-muted)]">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
        <p className="text-sm">Carregando editor…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !laudo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-white font-semibold">{error || "Laudo não encontrado."}</p>
        <button
          onClick={() => router.push("/laudos")}
          className="px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--text-label)] hover:text-white transition-colors"
        >
          Voltar para Laudos
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-[var(--background)] ${fullscreen ? "fixed inset-0 z-50" : ""}`}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-[var(--sidebar-bg)] border-b border-[var(--border)]">
        {/* Back */}
        <button
          onClick={() => router.push("/laudos")}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0"
          title="Voltar"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Doc info */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary-dim)] border border-[rgba(20,184,166,0.15)] flex items-center justify-center flex-shrink-0">
            <FileText size={15} className="text-[var(--primary)]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate leading-tight">{laudo.titulo}</div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">
              {laudo.paciente} &nbsp;·&nbsp; {laudo.tipo} &nbsp;·&nbsp; {laudo.data}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--primary-dim)] text-[var(--primary)] border border-[rgba(20,184,166,0.15)] flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
          {laudo.status}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            title="Recarregar"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={downloadPdf}
            disabled={downloading}
            title="Exportar PDF"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--primary-dim)] text-[var(--primary)] border border-[rgba(20,184,166,0.2)] hover:bg-[rgba(20,184,166,0.18)] transition-colors disabled:opacity-50"
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading ? "Exportando…" : "Exportar PDF"}
          </button>

          <a
            href={laudo.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no Google Docs"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ExternalLink size={15} />
          </a>

          <button
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? "Sair do modo tela cheia" : "Tela cheia"}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* ── Google Docs Editor iframe ── */}
      <div className="flex-1 relative overflow-hidden bg-[#f8f9fa]">
        {laudo.embed_url ? (
          <iframe
            key={iframeKey}
            src={laudo.embed_url}
            className="w-full h-full border-0"
            title={`Editor — ${laudo.titulo}`}
            allow="autoplay"
            loading="lazy"
          />
        ) : (
          /* Fallback: link direto */
          <div className="flex flex-col items-center justify-center h-full gap-5 bg-[var(--background)]">
            <div className="w-16 h-16 rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
              <FileText size={28} className="text-[var(--primary)]" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold mb-1">Embed não disponível</p>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                O Google pode estar bloqueando o embed. Abra diretamente no Google Docs.
              </p>
              <a
                href={laudo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-black font-bold text-sm hover:opacity-90 transition-opacity"
              >
                <ExternalLink size={16} />
                Abrir no Google Docs
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom bar */}
      <div className="sm:hidden flex-shrink-0 flex items-center gap-2 p-3 bg-[var(--sidebar-bg)] border-t border-[var(--border)]">
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--primary-dim)] text-[var(--primary)] border border-[rgba(20,184,166,0.2)] disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          {downloading ? "Exportando…" : "Exportar PDF"}
        </button>
        <a
          href={laudo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/[0.04] text-white border border-[var(--border)] flex items-center justify-center gap-1.5"
        >
          <ExternalLink size={13} />
          Google Docs
        </a>
      </div>
    </div>
  );
}
