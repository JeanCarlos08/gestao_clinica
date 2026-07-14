"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ExternalLink, Shield, ShieldOff, Clock, Loader2, FileText,
} from "lucide-react";
import GoogleDocsIframe from "@/components/GoogleDocsIframe";

export default function DocEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [docId, setDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Permission controls
  const [tempMinutes, setTempMinutes] = useState(30);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [permissionId, setPermissionId] = useState<string | null>(null);
  const [permMsg, setPermMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    async function fetchDoc() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/pacientes/${id}/document`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) throw new Error("Nenhum documento associado a esse paciente.");
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.detail || "Falha ao buscar documento");
        }
        const j = await res.json();
        if (mounted) setDocId(j.google_doc_id);
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchDoc();
    return () => { mounted = false; };
  }, [id]);

  const token = () => localStorage.getItem("token");

  const grantAccess = async () => {
    if (!docId) return;
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
      setPermMsg({ type: "success", text: `Acesso concedido por ${tempMinutes}min. Expira: ${j.expires_at || "N/A"}` });
    } catch (err: unknown) {
      setPermMsg({ type: "error", text: err instanceof Error ? err.message : "Erro" });
    } finally {
      setGranting(false);
    }
  };

  const revokeAccess = async () => {
    if (!docId || !permissionId) return;
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

  const onUrlReady = useCallback(() => {}, []);

  if (!id) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
        ID do paciente ausente.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden fade-up">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-[var(--text-label)] hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-px h-6 bg-[var(--border)]" />
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
            <FileText size={15} className="text-[var(--primary)]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">
              {loading ? "Carregando..." : error ? "Erro" : "Editor de Documento"}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] truncate">
              Paciente #{id} {docId && <span className="font-mono ml-1">· {docId.slice(0, 12)}...</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Temp access controls */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
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
            disabled={granting || !docId}
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

          {docId && (
            <a
              href={`https://docs.google.com/document/d/${docId}/edit`}
              target="_blank"
              rel="noreferrer noopener"
              title="Abrir em nova aba"
              className="p-2 rounded-lg text-[var(--text-label)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
            >
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>

      {/* Permission message */}
      {permMsg && (
        <div
          className={`flex items-center gap-2 px-6 py-2 text-xs font-medium border-b ${
            permMsg.type === "success"
              ? "bg-[var(--primary)]/5 border-[var(--primary)]/20 text-[var(--primary)]"
              : "bg-red-500/5 border-red-500/20 text-red-400"
          }`}
        >
          {permMsg.text}
          <button onClick={() => setPermMsg(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── Editor Area ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
            <p className="text-sm text-[var(--text-muted)]">Buscando documento...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <FileText size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Documento não encontrado</p>
              <p className="text-xs text-red-400 max-w-sm">{error}</p>
            </div>
            <button
              onClick={() => router.back()}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-[var(--primary)] text-black hover:opacity-90 transition-opacity"
            >
              Voltar
            </button>
          </div>
        ) : docId ? (
          <GoogleDocsIframe
            docId={docId}
            makePublic={false}
            temporaryMinutes={tempMinutes}
            onUrlReady={onUrlReady}
          />
        ) : null}
      </div>
    </div>
  );
}
