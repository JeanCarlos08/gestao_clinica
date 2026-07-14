"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X, ExternalLink, Shield, ShieldOff, Clock, RefreshCw, Maximize2, Minimize2,
} from "lucide-react";
import GoogleDocsIframe from "./GoogleDocsIframe";

type Props = {
  docId: string;
  onClose: () => void;
};

export default function GoogleDocsModal({ docId, onClose }: Props) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [tempMinutes, setTempMinutes] = useState(30);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [permMsg, setPermMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [permissionId, setPermissionId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const token = () => localStorage.getItem("token");

  const grantAccess = async () => {
    setGranting(true);
    setPermMsg(null);
    try {
      const res = await fetch("/api/docs/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ doc_id: docId, temporary_minutes: tempMinutes }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.detail || "Falha ao conceder acesso");
      setPermissionId(j.permission_id || null);
      setPermMsg({ type: "success", text: `Acesso concedido por ${tempMinutes} min. Expira: ${j.expires_at || "N/A"}` });
    } catch (err: unknown) {
      setPermMsg({ type: "error", text: err instanceof Error ? err.message : "Erro" });
    } finally {
      setGranting(false);
    }
  };

  const revokeAccess = async () => {
    if (!permissionId) return;
    setRevoking(true);
    setPermMsg(null);
    try {
      const res = await fetch("/api/docs/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ doc_id: docId, permission_id: permissionId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.detail || "Falha ao revogar");
      setPermissionId(null);
      setPermMsg({ type: "success", text: "Acesso revogado com sucesso." });
    } catch (err: unknown) {
      setPermMsg({ type: "error", text: err instanceof Error ? err.message : "Erro" });
    } finally {
      setRevoking(false);
    }
  };

  const onUrlReady = useCallback((url: string) => setEmbedUrl(url), []);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${fullscreen ? "" : "items-center justify-center p-4"}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={`relative flex flex-col bg-[var(--sidebar-bg)] border border-[var(--border)] overflow-hidden transition-all duration-300 ${
          fullscreen ? "inset-0 rounded-none" : "w-[92vw] max-w-6xl h-[88vh] rounded-2xl shadow-2xl"
        }`}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">📄</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">Editor Google Docs</div>
              <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">{docId}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Temp access */}
            <div className="flex items-center gap-1.5 mr-2">
              <Clock size={12} className="text-[var(--text-muted)]" />
              <input
                type="number"
                min={1}
                max={1440}
                value={tempMinutes}
                onChange={e => setTempMinutes(Number(e.target.value) || 30)}
                className="w-14 px-2 py-1 text-xs rounded-lg bg-[var(--background)] border border-[var(--border)] text-white text-center focus:outline-none focus:border-[var(--primary)]"
              />
              <span className="text-[10px] text-[var(--text-muted)]">min</span>
            </div>

            <button
              onClick={grantAccess}
              disabled={granting}
              title="Conceder acesso temporário"
              className="p-2 rounded-lg text-[var(--text-label)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50"
            >
              <Shield size={15} />
            </button>

            <button
              onClick={revokeAccess}
              disabled={revoking || !permissionId}
              title="Revogar acesso"
              className="p-2 rounded-lg text-[var(--text-label)] hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30"
            >
              <ShieldOff size={15} />
            </button>

            <div className="w-px h-5 bg-[var(--border)] mx-1" />

            <button
              onClick={() => setFullscreen(f => !f)}
              title={fullscreen ? "Sair de tela cheia" : "Tela cheia"}
              className="p-2 rounded-lg text-[var(--text-label)] hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <a
              href={`https://docs.google.com/document/d/${docId}/edit`}
              target="_blank"
              rel="noreferrer noopener"
              title="Abrir em nova aba"
              className="p-2 rounded-lg text-[var(--text-label)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
            >
              <ExternalLink size={15} />
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--text-label)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Permission message */}
        {permMsg && (
          <div
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b ${
              permMsg.type === "success"
                ? "bg-[var(--primary)]/5 border-[var(--primary)]/20 text-[var(--primary)]"
                : "bg-red-500/5 border-red-500/20 text-red-400"
            }`}
          >
            {permMsg.text}
            <button onClick={() => setPermMsg(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Iframe */}
        <div className="flex-1 min-h-0 bg-white">
          <GoogleDocsIframe
            docId={docId}
            makePublic={false}
            temporaryMinutes={tempMinutes}
            onUrlReady={onUrlReady}
          />
        </div>
      </div>
    </div>
  );
}
