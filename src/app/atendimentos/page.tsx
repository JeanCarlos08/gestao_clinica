"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import {
  CalendarDays, Clock, PlayCircle, Plus, Search,
  XCircle, RefreshCw, Filter, Sparkles, Building2, User,
  LayoutGrid, List, Kanban, MoreHorizontal, ChevronRight, CheckCircle2, AlertCircle
} from "lucide-react";
import EmptyIllustration from "@/components/EmptyIllustration";
import { swrFetcher, API as API_BASE } from "@/lib/api";

interface Atendimento {
  id: number; empresa: string; nome: string; modalidade: string; data: string; hora: string; status: string; paciente_id: number | null;
}

interface PacienteOption {
  id: number; nome: string; empresa: string | null;
}

const fetcher = swrFetcher;

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
  const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(null);
  const [pacienteSearch, setPacienteSearch] = useState("");
  const [pacienteOptions, setPacienteOptions] = useState<PacienteOption[]>([]);
  const [showPacienteDropdown, setShowPacienteDropdown] = useState(false);
  const [pacienteSearchLoading, setPacienteSearchLoading] = useState(false);
  const pacienteDropdownRef = useRef<HTMLDivElement>(null);

  // AI Prompt Modal
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Modern view state
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pacienteDropdownRef.current && !pacienteDropdownRef.current.contains(e.target as Node)) {
        setShowPacienteDropdown(false);
      }
    };
    if (showPacienteDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPacienteDropdown]);

  const { data: paginated, isLoading: loading, mutate } = useSWR<{ items: Atendimento[]; total: number; has_more: boolean }>(
    `${API_BASE}/atendimentos?q=${encodeURIComponent(debouncedQ)}&limit=50`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const atendimentos = paginated?.items ?? [];
  const filteredAtendimentos = statusFilter === "todos" ? atendimentos : atendimentos.filter(a => a.status === statusFilter);

  const openNew = () => {
    setEditingId(null); setEmpresa(""); setNome(""); setModalidade("");
    setData(new Date().toISOString().split("T")[0]); setHora("09:00"); setStatus("Agendado");
    setSelectedPacienteId(null); setPacienteSearch(""); setShowPacienteDropdown(false);
    setShowModal(true);
  };

  const saveAtendimento = async (e: React.FormEvent) => {
    e.preventDefault();
    const tk = localStorage.getItem("token");
    if (!tk) return;
    const body = { empresa, nome, modalidade, data, hora, status, paciente_id: selectedPacienteId };
    try {
      const url = editingId ? `${API_BASE}/atendimentos/${editingId}` : `${API_BASE}/atendimentos`;
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
      const res = await fetch(`${API_BASE}/ia/gerar-parecer`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: JSON.stringify({ notas: aiPrompt, modalidade: "Psicologia Clínica" }) });
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

  const searchPacientes = useCallback(async (q: string) => {
    const tk = localStorage.getItem("token");
    if (!tk || q.length < 2) { setPacienteOptions([]); setPacienteSearchLoading(false); return; }
    setPacienteSearchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pacientes?q=${encodeURIComponent(q)}&limit=10`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPacienteOptions(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.debug("Erro ao carregar pacientes:", e); }
    finally { setPacienteSearchLoading(false); }
  }, []);

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

      {/* Modern Filters + View Toggle */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 premium-surface rounded-xl p-3 flex items-center gap-3 border border-[var(--border)] focus-within:border-[var(--primary)]/30 transition-colors">
            <Search size={16} className="text-[var(--text-muted)] flex-shrink-0 ml-1" />
            <input
              type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar paciente, empresa ou modalidade..."
              className="w-full bg-transparent outline-none text-sm text-white placeholder:text-[var(--text-muted)]"
            />
            {q && <button onClick={() => setQ("")} className="text-[var(--text-muted)] hover:text-white p-1"><XCircle size={14} /></button>}
          </div>
          <div className="flex items-center gap-2">
            <div className="premium-surface rounded-xl p-1 flex items-center gap-1 border border-[var(--border)]">
              <button onClick={() => setViewMode("kanban")} className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode==="kanban" ? "bg-[var(--primary)] text-black shadow-md" : "text-[var(--text-muted)] hover:text-white"}`}><Kanban size={14} /> Kanban</button>
              <button onClick={() => setViewMode("lista")} className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode==="lista" ? "bg-[var(--primary)] text-black shadow-md" : "text-[var(--text-muted)] hover:text-white"}`}><List size={14} /> Lista</button>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {paginated?.total ?? atendimentos.length} ativos
            </div>
          </div>
        </div>
        {/* Status pills — app style, not Excel */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[
            { id:"todos", label:"Todos", count: atendimentos.length, color:"bg-white/5" },
            { id:"Agendado", label:"Agendados", count: atendimentos.filter(a=>a.status==="Agendado").length, color:"bg-amber-500/10 text-amber-400 border-amber-500/20" },
            { id:"Atendido", label:"Atendidos", count: atendimentos.filter(a=>a.status==="Atendido").length, color:"bg-blue-500/10 text-blue-400 border-blue-500/20" },
            { id:"Concluído", label:"Concluídos", count: atendimentos.filter(a=>a.status==="Concluído").length, color:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
            { id:"Cancelado", label:"Cancelados", count: atendimentos.filter(a=>a.status==="Cancelado").length, color:"bg-red-500/10 text-red-400 border-red-500/20" },
          ].map(p => (
            <button key={p.id} onClick={() => setStatusFilter(p.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all ${statusFilter===p.id ? "bg-[var(--primary)] text-black border-[var(--primary)] shadow-md" : "bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-light)]"}`}>
              {p.label} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter===p.id ? "bg-black/10" : p.color} border`}>{p.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modern Views */}
      {loading && atendimentos.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="premium-surface rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full skeleton" /><div className="flex-1"><div className="h-3 w-24 skeleton mb-2" /><div className="h-3 w-16 skeleton" /></div></div>
              <div className="h-20 skeleton rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredAtendimentos.length === 0 ? (
        <div className="premium-surface rounded-2xl p-16 text-center border border-[var(--border)]">
          <EmptyIllustration variant="appointment" size={100} />
          <p className="text-white font-semibold mt-4">{q || statusFilter!=="todos" ? "Nenhum resultado para o filtro" : "Nenhum atendimento ainda"}</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Ajuste os filtros ou crie um novo agendamento</p>
          <button onClick={openNew} className="mt-6 bg-[var(--primary)] text-black font-bold px-5 py-2.5 rounded-xl text-sm">+ Novo Agendamento</button>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 fade-up-delay-1">
          {(["Agendado","Atendido","Concluído","Cancelado"] as const).map(status => {
            const cols = filteredAtendimentos.filter(a => status==="Agendado" ? a.status==="Agendado" : a.status===status);
            const cfg = getStatusColor(status);
            return (
              <div key={status} className="premium-surface rounded-2xl border border-[var(--border)] flex flex-col min-h-[400px] overflow-hidden">
                <div className={`p-3 border-b border-[var(--border)] flex items-center justify-between bg-gradient-to-r ${status==="Concluído" ? "from-emerald-500/10 to-transparent" : status==="Atendido" ? "from-blue-500/10 to-transparent" : status==="Cancelado" ? "from-red-500/10 to-transparent" : "from-amber-500/10 to-transparent"}`}>
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${cfg.text}`}><span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {status}</span>
                  <span className="text-xs bg-[var(--card)] border border-[var(--border)] px-2 py-0.5 rounded-full font-bold">{cols.length}</span>
                </div>
                <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin max-h-[65vh]">
                  {cols.length===0 ? (
                    <div className="text-center py-8 text-xs text-[var(--text-muted)]">Vazio</div>
                  ) : cols.map(a => {
                    const s = getStatusColor(a.status);
                    const initials = a.nome.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join("");
                    return (
                      <div key={a.id} onClick={() => { setEditingId(a.id); setEmpresa(a.empresa); setNome(a.nome); setModalidade(a.modalidade); setData(a.data); setHora(a.hora); setStatus(a.status); setSelectedPacienteId(a.paciente_id||null); setPacienteSearch(""); setShowPacienteDropdown(false); setShowModal(true); }} className="group bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--primary)]/30 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--card)] border border-[var(--border)] flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">{initials}</div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-white truncate group-hover:text-[var(--primary)] transition-colors">{a.nome}</div>
                            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 truncate"><Building2 size={10} /> {a.empresa}</div>
                          </div>
                          <MoreHorizontal size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/5 text-[var(--text-muted)] truncate">{a.modalidade}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-[var(--text-muted)]"><CalendarDays size={10} /> {a.data.split("-").reverse().join("/")} <Clock size={10} className="ml-1" /> {a.hora}</span>
                          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        </div>
                        <button onClick={(e)=>{ e.stopPropagation(); setAiPrompt(`Gere um parecer para ${a.nome} da empresa ${a.empresa}.`); setAiResult(null); setShowAI(true); }} className="mt-3 w-full py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                          <Sparkles size={12} /> Parecer IA
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Lista moderna — sem <table>, app-style rows */
        <div className="premium-surface border border-[var(--border)] rounded-2xl overflow-hidden fade-up-delay-1">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]/50 backdrop-blur-sm">
            <span className="font-semibold text-sm flex items-center gap-2"><List size={16} className="text-[var(--primary)]" /> {statusFilter==="todos" ? "Todos os Agendamentos" : statusFilter} <span className="text-[var(--text-muted)] font-normal">· {filteredAtendimentos.length}</span></span>
            <span className="text-xs text-[var(--text-muted)] hidden sm:flex items-center gap-1">Clique no card para editar <ChevronRight size={12} /></span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {filteredAtendimentos.map(a => {
              const s = getStatusColor(a.status);
              const initials = a.nome.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join("");
              return (
                <div key={a.id} onClick={() => { setEditingId(a.id); setEmpresa(a.empresa); setNome(a.nome); setModalidade(a.modalidade); setData(a.data); setHora(a.hora); setStatus(a.status); setSelectedPacienteId(a.paciente_id||null); setPacienteSearch(""); setShowPacienteDropdown(false); setShowModal(true); }} className="group flex items-center gap-4 p-4 hover:bg-[var(--card-hover)] transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--card)] border border-[var(--border)] group-hover:border-[var(--primary)]/30 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{initials}</div>
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate group-hover:text-[var(--primary)] transition-colors">{a.nome}</div>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 truncate"><Building2 size={10} /> {a.empresa} <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" /> {a.modalidade}</div>
                    </div>
                    <div className="flex sm:justify-center">
                      <div className="inline-flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-full px-3 py-1.5">
                        <CalendarDays size={12} className="text-[var(--text-muted)]" /><span className="text-xs font-semibold text-white">{a.data.split("-").reverse().join("/")}</span><span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" /><Clock size={12} className="text-[var(--text-muted)]" /><span className="text-xs text-[var(--text-muted)]">{a.hora}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.bg} ${s.text}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{a.status}</span>
                      <button onClick={(e)=>{ e.stopPropagation(); setAiPrompt(`Gere um parecer para ${a.nome} da empresa ${a.empresa}.`); setAiResult(null); setShowAI(true); }} className="hidden sm:inline-flex items-center gap-1 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><Sparkles size={12} /> IA</button>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                  <div className="relative" ref={pacienteDropdownRef}>
                    <input
                      value={selectedPacienteId ? nome : pacienteSearch}
                      onChange={e => {
                        setPacienteSearch(e.target.value);
                        setNome(e.target.value);
                        setSelectedPacienteId(null);
                        setShowPacienteDropdown(true);
                        searchPacientes(e.target.value);
                      }}
                      onFocus={() => { if (pacienteSearch.length >= 2) setShowPacienteDropdown(true); }}
                      placeholder="Buscar paciente..."
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors"
                    />
                    {showPacienteDropdown && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {pacienteSearchLoading && (
                          <div className="px-3 py-2 text-xs text-[var(--text-muted)] flex items-center gap-2">
                            <RefreshCw size={12} className="animate-spin" /> Buscando...
                          </div>
                        )}
                        {!pacienteSearchLoading && pacienteOptions.length === 0 && pacienteSearch.length >= 2 && (
                          <div className="px-3 py-2 text-xs text-[var(--text-muted)]">Nenhum paciente encontrado</div>
                        )}
                        {!pacienteSearchLoading && pacienteOptions.map(p => (
                          <button key={p.id} type="button"
                            onClick={() => {
                              setNome(p.nome); setEmpresa(p.empresa || ""); setSelectedPacienteId(p.id);
                              setPacienteSearch(""); setShowPacienteDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[var(--primary)]/10 transition-colors border-b border-[var(--border)] last:border-0">
                            <div className="font-semibold">{p.nome}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{p.empresa || "Sem empresa"}</div>
                          </button>
                        ))}
                        {!pacienteSearchLoading && pacienteSearch.length >= 2 && (
                          <button type="button"
                            onClick={() => {
                              setNome(pacienteSearch); setSelectedPacienteId(null);
                              setPacienteSearch(""); setShowPacienteDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors">
                            + Criar novo paciente &quot;{pacienteSearch}&quot;
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
