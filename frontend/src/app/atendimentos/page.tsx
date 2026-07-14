"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  CalendarDays, Clock, PlayCircle, Plus, Search,
  XCircle, RefreshCw, Filter, Sparkles, Building2, User
} from "lucide-react";
import EmptyIllustration from "@/components/EmptyIllustration";

interface Atendimento {
  id: number; empresa: string; nome: string; modalidade: string; data: string; hora: string; status: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "/api";
const fetcher = async (url: string) => {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "/"; return []; }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/"; return []; }
  return res.json();
};

export default function AtendimentosPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form
  const [empresa, setEmpresa] = useState("");
  const [nome, setNome] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [status, setStatus] = useState("Agendado");

  // AI Prompt Modal
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);

  const { data: paginated, isLoading: loading, mutate } = useSWR<{ items: Atendimento[]; total: number; has_more: boolean }>(
    `${API}/atendimentos?q=${encodeURIComponent(debouncedQ)}&limit=50`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const atendimentos = paginated?.items ?? [];

  const openNew = () => {
    setEditingId(null); setEmpresa(""); setNome(""); setModalidade("");
    setData(new Date().toISOString().split("T")[0]); setHora("09:00"); setStatus("Agendado"); setShowModal(true);
  };

  const saveAtendimento = async (e: React.FormEvent) => {
    e.preventDefault();
    const tk = localStorage.getItem("token");
    if (!tk) return;
    const body = { empresa, nome, modalidade, data, hora, status };
    try {
      const url = editingId ? `${API}/atendimentos/${editingId}` : `${API}/atendimentos`;
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: JSON.stringify(body) });
      if (res.ok) { setShowModal(false); mutate(); }
    } catch { alert("Erro ao salvar."); }
  };

  const handleAI = async () => {
    if (!aiPrompt.trim()) return;
    const tk = localStorage.getItem("token");
    if (!tk) return;
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API}/ia/gerar-parecer`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: JSON.stringify({ notas: aiPrompt, modalidade: "Psicologia Clínica" }) });
      if (res.ok) { const d = await res.json(); setAiResult(d.texto); }
      else setAiResult("Erro ao gerar.");
    } catch { setAiResult("Falha na comunicação."); }
    finally { setAiLoading(false); }
  };

  const copyAIParecer = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult);
    alert("Parecer copiado para a área de transferência!");
    setShowAI(false);
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Concluído": return { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
      case "Em andamento": return { dot: "bg-purple-400 pulse-green", text: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" };
      case "Cancelado": return { dot: "bg-red-400", text: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
      default: return { dot: "bg-amber-400 pulse-amber", text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <CalendarDays size={16} className="text-violet-400" />
            </div>
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Agenda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Atendimentos</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Gerencie consultas e avaliações clínicas</p>
        </div>
        <button onClick={openNew} className="flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)]">
          <Plus size={16} strokeWidth={2.5} /> Novo Agendamento
        </button>
      </div>

      {/* Filters/Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-3 premium-surface rounded-xl p-3 flex items-center gap-3 border border-[var(--border)] focus-within:border-[var(--primary)]/30 transition-colors">
          <Search size={16} className="text-[var(--text-muted)] flex-shrink-0 ml-1" />
          <input
            type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por paciente, empresa ou modalidade..."
            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-[var(--text-muted)]"
          />
        </div>
        <div className="premium-surface rounded-xl p-3 border border-[var(--border)] flex items-center gap-2 justify-center cursor-pointer hover:bg-[var(--card-hover)] transition-colors text-sm font-semibold text-[var(--text-label)]">
          <Filter size={16} /> Filtros Avançados
        </div>
      </div>

      {/* Table */}
      <div className="premium-surface border border-[var(--border)] rounded-2xl overflow-hidden fade-up-delay-1">
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card)]">
          <span className="font-semibold text-sm flex items-center gap-2">
            <CalendarDays size={16} className="text-[var(--primary)]" /> Todos os Agendamentos
          </span>
          <div className="text-xs font-semibold text-[var(--text-muted)]">{paginated?.total ?? atendimentos.length} registros</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider">
                <th className="p-4 font-semibold pl-6">Paciente & Empresa</th>
                <th className="p-4 font-semibold">Modalidade</th>
                <th className="p-4 font-semibold">Data/Hora</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && atendimentos.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-[var(--text-muted)]"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /> Carregando...</td></tr>
              ) : atendimentos.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center">
                  <div className="flex flex-col items-center">
                    <EmptyIllustration variant="appointment" size={90} />
                    <p className="text-sm text-[var(--text-muted)] mt-4">Nenhum atendimento encontrado.</p>
                  </div>
                </td></tr>
              ) : (
                atendimentos.map((a) => {
                  const s = getStatusColor(a.status);
                  return (
                    <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors group">
                      <td className="p-4 pl-6 cursor-pointer" onClick={() => {
                        setEditingId(a.id); setEmpresa(a.empresa); setNome(a.nome); setModalidade(a.modalidade);
                        setData(a.data); setHora(a.hora); setStatus(a.status); setShowModal(true);
                      }}>
                        <div className="font-bold text-sm text-white mb-0.5 group-hover:text-[var(--primary)] transition-colors">{a.nome}</div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1"><Building2 size={10} /> {a.empresa}</div>
                      </td>
                      <td className="p-4 text-sm text-[var(--text-muted)] font-medium">{a.modalidade}</td>
                      <td className="p-4">
                        <div className="text-sm font-semibold text-white">{a.data.split("-").reverse().join("/")}</div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5"><Clock size={10} /> {a.hora}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${s.bg} ${s.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {a.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => { setAiPrompt(`Gere um parecer para ${a.nome} da empresa ${a.empresa}.`); setAiResult(null); setShowAI(true); }}
                          className="inline-flex items-center gap-1 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          <Sparkles size={12} /> Gerar Parecer
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-[0_32px_64px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingId ? <><CalendarDays size={18} className="text-[var(--primary)]" /> Editar Atendimento</> : <><Plus size={18} className="text-[var(--primary)]" /> Novo Atendimento</>}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-white"><XCircle size={20} /></button>
            </div>
            <form onSubmit={saveAtendimento} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1"><User size={12} /> Paciente</label>
                  <input required value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Building2 size={12} /> Empresa</label>
                  <input required value={empresa} onChange={e => setEmpresa(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Modalidade</label>
                  <input required value={modalidade} onChange={e => setModalidade(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Data</label>
                  <input type="date" required value={data} onChange={e => setData(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Hora</label>
                  <input type="time" required value={hora} onChange={e => setHora(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors appearance-none">
                    <option>Agendado</option>
                    <option>Atendido</option>
                    <option>Em andamento</option>
                    <option>Concluído</option>
                    <option>Cancelado</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(20,184,166,0.25)] hover:shadow-[0_0_25px_rgba(20,184,166,0.4)]">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal IA */}
      {showAI && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-[0_32px_64px_rgba(0,0,0,0.7)]">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-violet-400" /> Parecer IA (Gemini)
              </h2>
              <button onClick={() => setShowAI(false)} className="text-[var(--text-muted)] hover:text-white"><XCircle size={20} /></button>
            </div>
            <div className="p-6">
              <textarea
                value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={3}
                placeholder="Ex: Paciente relatou dor nas costas. Fez fisioterapia..."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-sm text-white focus:border-violet-500/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] focus:outline-none transition-all mb-4"
              />
              <button onClick={handleAI} disabled={aiLoading} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-4 py-3 rounded-xl text-sm transition-all disabled:opacity-50">
                {aiLoading ? <RefreshCw size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                {aiLoading ? "Processando..." : "Gerar Parecer"}
              </button>

              {aiResult && (
                <div className="mt-6">
                  <div className="text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-2">Resultado:</div>
                  <div className="bg-[var(--background)] border border-[var(--border)] p-4 rounded-xl text-sm text-white whitespace-pre-wrap max-h-60 overflow-y-auto mb-4">{aiResult}</div>
                  <div className="flex justify-end">
                    <button onClick={copyAIParecer} className="bg-[var(--primary)] text-black font-bold px-6 py-2.5 rounded-xl text-sm shadow-[0_0_15px_rgba(20,184,166,0.25)] hover:shadow-[0_0_25px_rgba(20,184,166,0.4)]">
                      Copiar Parecer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
