"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  FileText, CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle, Search, FileDown, Plus
} from "lucide-react";
import EmptyIllustration from "@/components/EmptyIllustration";

interface Laudo {
  id: string;
  db_id: number;
  titulo: string;
  paciente: string;
  tipo: string;
  data: string;
  status: string;
  url: string;
  embed_url: string;
}

interface LaudoForm {
  nome_paciente: string;
  data_nascimento: string;
  cpf: string;
  empresa: string;
  data_exame: string;
  motivo_avaliacao: string;
  avaliacao_psicologica: boolean;
  admissional: boolean;
  periodica: boolean;
  pessoal: boolean;
  mudanca_funcao: boolean;
  itens_auxiliados: string;
  conclusao: string;
  psicologista_nome: string;
  psicologista_crp: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "/api";
const fetcher = async (url: string) => {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "/"; return []; }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/"; return []; }
  return res.json();
};

const emptyForm: LaudoForm = {
  nome_paciente: "", data_nascimento: "", cpf: "", empresa: "",
  data_exame: new Date().toISOString().split("T")[0],
  motivo_avaliacao: "", avaliacao_psicologica: false, admissional: false,
  periodica: false, pessoal: false, mudanca_funcao: false,
  itens_auxiliados: "", conclusao: "", psicologista_nome: "Dr. Psicólogo", psicologista_crp: "XX/XXXXX",
};

export default function LaudosPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<LaudoForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);

  const { data: laudos = [], isLoading: loading, mutate } = useSWR<Laudo[]>(
    `${API}/laudos?q=${encodeURIComponent(debouncedQ)}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const gerarLaudo = async () => {
    const tk = localStorage.getItem("token");
    if (!tk) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/laudos/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowModal(false); setForm(emptyForm); mutate(); }
      else alert("Erro ao gerar laudo.");
    } catch { alert("Erro de comunicação."); }
    finally { setSaving(false); }
  };

  const downloadPdf = async (docId: string, nome: string) => {
    const tk = localStorage.getItem("token");
    if (!tk) return;
    try {
      const res = await fetch(`${API}/laudos/${docId}/pdf`, { headers: { Authorization: `Bearer ${tk}` } });
      if (!res.ok) { alert("Erro ao baixar PDF."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laudo_${nome.replace(/\s+/g, "_")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { alert("Erro ao baixar PDF."); }
  };

  const statusIcons: Record<string, JSX.Element> = {
    "Gerado": <CheckCircle2 size={14} className="text-emerald-400" />,
  };
  const statusColors: Record<string, string> = {
    "Gerado": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
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
        <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)]">
          <Plus size={16} strokeWidth={2.5} /> Novo Laudo
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { label: "Total de Laudos", value: laudos.length, icon: <FileText size={16} />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/15" },
          { label: "Gerados com Sucesso", value: laudos.filter(l => l.status === "Gerado").length, icon: <CheckCircle2 size={16} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
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
          <button onClick={() => mutate()} className="text-[var(--primary)] hover:text-[var(--primary-bright)] flex items-center gap-1 text-xs">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider bg-[var(--background)]">
                <th className="p-4 pl-6 font-semibold">Paciente</th>
                <th className="p-4 font-semibold">Tipo</th>
                <th className="p-4 font-semibold">Data</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && laudos.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-[var(--text-muted)]"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /> Carregando...</td></tr>
              ) : laudos.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center">
                  <div className="flex flex-col items-center">
                    <EmptyIllustration variant="document" size={90} />
                    <p className="text-sm text-[var(--text-muted)] mt-4">Nenhum laudo encontrado.</p>
                  </div>
                </td></tr>
              ) : (
                laudos.map(l => (
                  <tr key={l.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-sm text-white mb-0.5">{l.paciente}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{l.titulo}</div>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)] font-medium">{l.tipo}</td>
                    <td className="p-4 text-sm font-semibold text-white">{l.data}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColors[l.status] || "bg-gray-500/10 text-gray-400"}`}>
                        {statusIcons[l.status] || <Clock size={14} className="text-gray-400" />} {l.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      {l.url && (
                        <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors">
                          <FileText size={12} /> Google Docs
                        </a>
                      )}
                      <button onClick={() => downloadPdf(l.id, l.paciente)} className="inline-flex items-center gap-1.5 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/20 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors">
                        <FileDown size={12} /> Baixar PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Gerar Laudo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-[0_32px_64px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--card)] z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-amber-400" /> Gerar Novo Laudo
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-white"><XCircle size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Nome do Paciente *</label>
                  <input required value={form.nome_paciente} onChange={e => setForm({ ...form, nome_paciente: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Data de Nascimento *</label>
                  <input type="date" required value={form.data_nascimento} onChange={e => setForm({ ...form, data_nascimento: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">CPF *</label>
                  <input required value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Empresa</label>
                  <input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Data do Exame *</label>
                  <input type="date" required value={form.data_exame} onChange={e => setForm({ ...form, data_exame: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Motivo da Avaliação</label>
                  <input value={form.motivo_avaliacao} onChange={e => setForm({ ...form, motivo_avaliacao: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-2">Tipo de Avaliação</label>
                  <div className="flex flex-wrap gap-3">
                    {(["avaliacao_psicologica", "admissional", "periodica", "pessoal", "mudanca_funcao"] as const).map(key => (
                      <label key={key} className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
                        <input type="checkbox" checked={form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="rounded border-[var(--border)]" />
                        {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Itens Auxiliados</label>
                  <textarea value={form.itens_auxiliados} onChange={e => setForm({ ...form, itens_auxiliados: e.target.value })} rows={2} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Conclusão</label>
                  <textarea value={form.conclusao} onChange={e => setForm({ ...form, conclusao: e.target.value })} rows={3} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Psicólogo(a)</label>
                  <input value={form.psicologista_nome} onChange={e => setForm({ ...form, psicologista_nome: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">CRP</label>
                  <input value={form.psicologista_crp} onChange={e => setForm({ ...form, psicologista_crp: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-white transition-colors">Cancelar</button>
                <button onClick={gerarLaudo} disabled={saving || !form.nome_paciente || !form.cpf || !form.data_exame} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(20,184,166,0.25)] hover:shadow-[0_0_25px_rgba(20,184,166,0.4)] disabled:opacity-50">
                  {saving ? <RefreshCw size={16} className="animate-spin inline mr-2" /> : null}
                  {saving ? "Gerando..." : "Gerar Laudo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
