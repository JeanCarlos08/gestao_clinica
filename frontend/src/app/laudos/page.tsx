"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText, CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle, Search, FileDown, Plus
} from "lucide-react";

interface Laudo {
  id: number;
  atendimento_id: number;
  paciente_nome: string;
  empresa: string;
  modalidade: string;
  status: string;
  pdf_base64: string | null;
  google_doc_url: string | null;
  criado_em: string;
}

export default function LaudosPage() {
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL || "/api";
  const getToken = () => localStorage.getItem("token");

  const fetchLaudos = useCallback(async () => {
    const tk = getToken();
    if (!tk) { window.location.href = "/"; return; }
    if (!debouncedQ) {
      try {
        const cached = localStorage.getItem("laudos_cache");
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < 30000) { setLaudos(data); setLoading(false); }
        }
      } catch { /* ignore */ }
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/laudos?q=${encodeURIComponent(debouncedQ)}`, { headers: { Authorization: `Bearer ${tk}` } });
      if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/"; return; }
      const data = await res.json();
      setLaudos(data);
      if (!debouncedQ) localStorage.setItem("laudos_cache", JSON.stringify({ data, ts: Date.now() }));
    } catch { console.error("Error fetching laudos"); }
    finally { setLoading(false); }
  }, [API, debouncedQ]);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { fetchLaudos(); }, [fetchLaudos]);

  const gerarLaudo = async (id: number) => {
    const tk = getToken(); if (!tk) return;
    try {
      const res = await fetch(`${API}/laudos/gerar/${id}`, { method: "POST", headers: { Authorization: `Bearer ${tk}` } });
      if (res.ok) fetchLaudos();
      else alert("Erro ao gerar laudo.");
    } catch { alert("Erro de comunicação."); }
  };

  const getPdf = (b64: string, nome: string) => {
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${b64}`;
    link.download = `Laudo_${nome.replace(/\s+/g, "_")}.pdf`;
    link.click();
  };

  const statusIcons: Record<string, JSX.Element> = {
    "Gerado": <CheckCircle2 size={14} className="text-emerald-400" />,
    "Pendente": <Clock size={14} className="text-amber-400" />,
    "Erro": <AlertCircle size={14} className="text-red-400" />
  };
  const statusColors: Record<string, string> = {
    "Gerado": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Pendente": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Erro": "bg-red-500/10 text-red-400 border-red-500/20"
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <FileText size={16} className="text-amber-400" />
            </div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Documentos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Laudos Clínicos</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Geração automática de laudos via Google Docs e PDF.</p>
        </div>
        <button onClick={() => window.location.href = "/atendimentos"} className="flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]">
          <Plus size={16} strokeWidth={2.5} /> Novo Laudo (via Atendimento)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total de Laudos", value: laudos.length, icon: <FileText size={16} />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/15" },
          { label: "Gerados com Sucesso", value: laudos.filter(l => l.status === "Gerado").length, icon: <CheckCircle2 size={16} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
          { label: "Pendentes de Geração", value: laudos.filter(l => l.status === "Pendente").length, icon: <Clock size={16} />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/15" },
        ].map(({ label, value, icon, color, bg, border }) => (
          <div key={label} className={`premium-surface rounded-2xl p-5 border ${border} hover:-translate-y-0.5 transition-transform`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">{label}</span>
              <span className={`${color} ${bg} p-1.5 rounded-lg border border-white/5`}>{icon}</span>
            </div>
            <div className="text-3xl font-extrabold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="premium-surface rounded-xl p-3 mb-6 flex items-center gap-3 border border-[var(--border)] focus-within:border-[var(--primary)]/30 transition-colors">
        <Search size={16} className="text-[var(--text-muted)] flex-shrink-0 ml-1" />
        <input
          type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar laudo por paciente, empresa ou modalidade..."
          className="w-full bg-transparent outline-none text-sm text-white placeholder:text-[var(--text-muted)]"
        />
        {q && <button onClick={() => setQ("")} className="text-[var(--text-muted)] hover:text-white"><XCircle size={14} /></button>}
      </div>

      {/* Tabela de Laudos */}
      <div className="premium-surface border border-[var(--border)] rounded-2xl overflow-hidden fade-up-delay-1">
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card)]">
          <span className="font-semibold text-sm flex items-center gap-2">
            <FileText size={16} className="text-[var(--primary)]" /> Base de Laudos
          </span>
          <button onClick={fetchLaudos} className="text-[var(--primary)] hover:text-[var(--primary-bright)] flex items-center gap-1 text-xs">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider bg-[var(--background)]">
                <th className="p-4 pl-6 font-semibold">Paciente</th>
                <th className="p-4 font-semibold">Empresa / Modalidade</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && laudos.length === 0 ? (
                <tr><td colSpan={4} className="p-16 text-center text-[var(--text-muted)]"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /> Carregando...</td></tr>
              ) : laudos.length === 0 ? (
                <tr><td colSpan={4} className="p-16 text-center text-[var(--text-muted)]">Nenhum laudo encontrado.</td></tr>
              ) : (
                laudos.map(l => (
                  <tr key={l.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-sm text-white mb-0.5">{l.paciente_nome}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">Atend. #{l.atendimento_id} • {new Date(l.criado_em).toLocaleDateString("pt-BR")}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-[var(--text-secondary)]">{l.empresa}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{l.modalidade}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColors[l.status] || "bg-gray-500/10 text-gray-400"}`}>
                        {statusIcons[l.status]} {l.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      {l.status === "Gerado" ? (
                        <>
                          {l.google_doc_url && (
                            <a href={l.google_doc_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors">
                              <FileText size={12} /> Google Docs
                            </a>
                          )}
                          {l.pdf_base64 && (
                            <button onClick={() => getPdf(l.pdf_base64!, l.paciente_nome)} className="inline-flex items-center gap-1.5 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/20 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors">
                              <FileDown size={12} /> Baixar PDF
                            </button>
                          )}
                        </>
                      ) : (
                        <button onClick={() => gerarLaudo(l.atendimento_id)} className="inline-flex items-center gap-1.5 bg-[var(--primary)] text-black px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all">
                          <RefreshCw size={12} /> Gerar Laudo
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
