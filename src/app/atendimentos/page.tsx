"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import {
  CalendarDays, Clock, PlayCircle, Plus, Search,
  XCircle, RefreshCw, Sparkles, Building2, User,
  List, Kanban, MoreHorizontal, ChevronRight, Calendar,
  FileText, StickyNote, Wand2, Eraser, Loader2,
  Settings2, Download
} from "lucide-react";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import EmptyIllustration from "@/components/EmptyIllustration";
import StatusBadge from "@/components/StatusBadge";
import { swrFetcher, API as API_BASE } from "@/lib/api";
import { MODALIDADES } from "@/lib/constants";

interface Atendimento {
  id: number; empresa: string; nome: string; modalidade: string; data: string; hora: string; status: string; paciente_id: number | null;
  observacoes: string | null; laudo_pdf: string | null; avaliacao_pdf: string | null;
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
  const [modalidadeCustom, setModalidadeCustom] = useState("");
  const isCustomModalidade = modalidade && !MODALIDADES.includes(modalidade) && modalidade !== "Outro";
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [status, setStatus] = useState("Agendado");
  const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(null);
  const [pacienteSearch, setPacienteSearch] = useState("");
  const [pacienteOptions, setPacienteOptions] = useState<PacienteOption[]>([]);
  const [showPacienteDropdown, setShowPacienteDropdown] = useState(false);
  const [pacienteSearchLoading, setPacienteSearchLoading] = useState(false);
  const pacienteDropdownRef = useRef<HTMLDivElement>(null);

  // Observações + anexos (📄 Laudo PDF / 📝 Avaliação PDF) — paridade streamlit
  const [observacoes, setObservacoes] = useState("");
  const [laudoFile, setLaudoFile] = useState<File | null>(null);
  const [avalFile, setAvalFile] = useState<File | null>(null);
  const [laudoRef, setLaudoRef] = useState<string | null>(null);
  const [avalRef, setAvalRef] = useState<string | null>(null);
  const [anexoMsg, setAnexoMsg] = useState("");
  const [iaBusy, setIaBusy] = useState<"" | "laudo" | "aval">("");
  const [saving, setSaving] = useState(false);
  const [pdfView, setPdfView] = useState<{ url: string; titulo: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Painel Gerenciar por atendimento (paridade streamlit):
  // visualizar/download/editar/status/exportar/excluir + parecer IA
  const [manageId, setManageId] = useState<number | null>(null);
  const [manageStatus, setManageStatus] = useState("Agendado");
  const [paneMsg, setPaneMsg] = useState("");
  const [paneBusy, setPaneBusy] = useState("status");
  const [aiModalidade, setAiModalidade] = useState("Psicologia Clínica");

  // AI Prompt Modal
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Modern view state
  const [viewMode, setViewMode] = useState<"kanban" | "lista" | "calendario">("kanban");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => () => { if (pdfView?.url) URL.revokeObjectURL(pdfView.url); }, [pdfView]);

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

  const atendimentos = (paginated?.items ?? []).map(a => ({ ...a, status: a.status || "Agendado" }));
  const filteredAtendimentos = statusFilter === "todos" ? atendimentos : atendimentos.filter(a => a.status === statusFilter);

  const resetAnexos = () => {
    setObservacoes(""); setLaudoFile(null); setAvalFile(null);
    setLaudoRef(null); setAvalRef(null); setAnexoMsg(""); setIaBusy("");
  };

  const openNew = () => {
    setEditingId(null); setEmpresa(""); setNome(""); setModalidade(""); setModalidadeCustom("");
    setData(new Date().toISOString().split("T")[0]); setHora("09:00"); setStatus("Agendado");
    setSelectedPacienteId(null); setPacienteSearch(""); setShowPacienteDropdown(false);
    resetAnexos();
    setShowModal(true);
  };

  const openEdit = (a: Atendimento) => {
    setEditingId(a.id); setEmpresa(a.empresa); setNome(a.nome); setModalidade(a.modalidade);
    setData(a.data); setHora(a.hora); setStatus(a.status);
    setSelectedPacienteId(a.paciente_id || null); setPacienteSearch(""); setShowPacienteDropdown(false);
    setObservacoes(a.observacoes || ""); setLaudoFile(null); setAvalFile(null);
    setLaudoRef(a.laudo_pdf || null); setAvalRef(a.avaliacao_pdf || null);
    setAnexoMsg(""); setIaBusy("");
    setShowModal(true);
  };

  const uploadAnexo = async (file: File, prefixo: string): Promise<string | null> => {
    const tk = localStorage.getItem("token");
    if (!tk) return null;
    const fd = new FormData();
    fd.append("file", file, `${prefixo}_${Date.now()}_${file.name}`);
    const res = await fetch(`${API_BASE}/arquivos`, { method: "POST", headers: { Authorization: `Bearer ${tk}` }, body: fd });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.id ? `db:${d.id}` : null;
  };

  const validarPdfIA = async (file: File): Promise<string> => {
    const tk = localStorage.getItem("token");
    if (!tk) return "Sessão expirada. Faça login novamente.";
    try {
      const fd = new FormData();
      fd.append("pdf", file); fd.append("mode", "validar");
      const res = await fetch(`${API_BASE}/ia/pdf`, { method: "POST", headers: { Authorization: `Bearer ${tk}` }, body: fd });
      if (res.status === 503) return "";
      if (!res.ok) return "Não foi possível validar o PDF com a IA.";
      const d = await res.json();
      return d?.valido ? "" : (d?.msg || "Selecione um PDF clínico (ex.: laudo, atestado, exame).");
    } catch {
      return "Falha na validação do PDF.";
    }
  };

  const saveAtendimento = async (e: React.FormEvent) => {
    e.preventDefault();
    const tk = localStorage.getItem("token");
    if (!tk) return;
    setAnexoMsg(""); setSaving(true);
    try {
      let laudoFinal = laudoRef, avalFinal = avalRef;
      if (laudoFile) {
        const invalido = await validarPdfIA(laudoFile);
        if (invalido) { setAnexoMsg(`Laudo: ${invalido}`); setSaving(false); return; }
        laudoFinal = await uploadAnexo(laudoFile, "laudo");
        if (!laudoFinal) { setAnexoMsg("Falha ao enviar o Laudo PDF."); setSaving(false); return; }
      }
      if (avalFile) {
        const invalido = await validarPdfIA(avalFile);
        if (invalido) { setAnexoMsg(`Avaliação: ${invalido}`); setSaving(false); return; }
        avalFinal = await uploadAnexo(avalFile, "avaliacao");
        if (!avalFinal) { setAnexoMsg("Falha ao enviar a Avaliação PDF."); setSaving(false); return; }
      }
      const body: Record<string, unknown> = { empresa, nome, modalidade, data, hora, status, paciente_id: selectedPacienteId };
      if (observacoes) body.observacoes = observacoes;
      if (laudoFinal) body.laudo_pdf = laudoFinal;
      if (avalFinal) body.avaliacao_pdf = avalFinal;
      const url = editingId ? `${API_BASE}/atendimentos/${editingId}` : `${API_BASE}/atendimentos`;
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: JSON.stringify(body) });
      if (res.ok) { setShowModal(false); mutate(); }
      else setAnexoMsg("Erro ao salvar atendimento.");
    } catch {
      setAnexoMsg("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const iaAnexar = async (kind: "laudo" | "aval") => {
    const file = kind === "laudo" ? laudoFile : avalFile;
    const termo = kind === "laudo" ? "Laudo" : "Avaliação";
    if (!file) { setAnexoMsg(`Anexe o ${termo} PDF primeiro.`); return; }
    const tk = localStorage.getItem("token");
    if (!tk) return;
    setAnexoMsg(""); setIaBusy(kind);
    try {
      const fd = new FormData();
      fd.append("pdf", file); fd.append("mode", "resumo");
      const res = await fetch(`${API_BASE}/ia/pdf`, { method: "POST", headers: { Authorization: `Bearer ${tk}` }, body: fd });
      if (res.ok) {
        const d = await res.json();
        setObservacoes(d.texto || "A IA não retornou uma resposta.");
      } else {
        setAnexoMsg(`A IA não pôde analisar o ${termo} agora.`);
      }
    } catch {
      setAnexoMsg("Falha na comunicação com a IA.");
    } finally {
      setIaBusy("");
    }
  };

  const limparNotasIA = () => setObservacoes("");

  const openAnexo = async (ref: string | null | undefined, titulo: string) => {
    if (!ref) return;
    if (!ref.startsWith("db:")) { setAnexoMsg("Este anexo não tem visualização disponível."); return; }
    const tk = localStorage.getItem("token");
    if (!tk) return;
    setPdfLoading(true); setPdfView({ url: "", titulo });
    try {
      const res = await fetch(`${API_BASE}/arquivos/${ref.slice(3)}`, { headers: { Authorization: `Bearer ${tk}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setPdfView({ url: URL.createObjectURL(blob), titulo });
    } catch {
      setPdfView(null);
      setAnexoMsg("Não foi possível abrir o anexo.");
    } finally {
      setPdfLoading(false);
    }
  };

  const baixarAnexo = async (ref: string | null | undefined, nome: string) => {
    if (!ref) return;
    if (!ref.startsWith("db:")) { setPaneMsg("Este anexo não permite download."); return; }
    const tk = localStorage.getItem("token");
    if (!tk) return;
    setPaneMsg("");
    try {
      const res = await fetch(`${API_BASE}/arquivos/${ref.slice(3)}`, { headers: { Authorization: `Bearer ${tk}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const dl = document.createElement("a");
      const url = URL.createObjectURL(blob);
      dl.href = url; dl.download = nome; dl.click();
      URL.revokeObjectURL(url);
    } catch {
      setPaneMsg("Não foi possível preparar o download do anexo.");
    }
  };

  const exportarAtendimento = (a: Atendimento) => {
    const reg = { id: a.id, nome: a.nome, empresa: a.empresa, modalidade: a.modalidade, data: a.data, hora: a.hora, status: a.status, paciente_id: a.paciente_id, observacoes: a.observacoes, laudo_pdf: a.laudo_pdf, avaliacao_pdf: a.avaliacao_pdf };
    const blob = new Blob([JSON.stringify(reg, null, 2)], { type: "application/json" });
    const dl = document.createElement("a");
    const url = URL.createObjectURL(blob);
    dl.href = url; dl.download = `atendimento-${a.id}.json`; dl.click();
    URL.revokeObjectURL(url);
  };

  const salvarStatusManage = async () => {
    const managed = atendimentos.find(x => x.id === manageId);
    const tk = localStorage.getItem("token");
    if (!managed || !tk) return;
    setPaneBusy("status"); setPaneMsg("");
    try {
      const res = await fetch(`${API_BASE}/atendimentos/${managed.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: JSON.stringify({ status: manageStatus }) });
      if (res.ok) { setPaneMsg("Status atualizado."); mutate(); }
      else setPaneMsg("Erro ao salvar status.");
    } catch {
      setPaneMsg("Erro de comunicação.");
    } finally {
      setPaneBusy("");
    }
  };

  const excluirAtendimento = async (a: Atendimento) => {
    if (!window.confirm(`Excluir definitivamente o atendimento #${a.id} de ${a.nome}?`)) return;
    const tk = localStorage.getItem("token");
    if (!tk) return;
    setPaneBusy("excluir"); setPaneMsg("");
    try {
      const res = await fetch(`${API_BASE}/atendimentos/${a.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${tk}` } });
      if (res.ok) { setManageId(null); mutate(); }
      else setPaneMsg("Erro ao excluir.");
    } catch {
      setPaneMsg("Erro de comunicação.");
    } finally {
      setPaneBusy("");
    }
  };

  const openGerenciar = (a: Atendimento) => {
    setManageId(a.id); setManageStatus(a.status); setPaneMsg(""); setPaneBusy("");
  };

  const managed = atendimentos.find(x => x.id === manageId) || null;

  const handleAI = async () => {
    if (!aiPrompt.trim()) return;
    const tk = localStorage.getItem("token");
    if (!tk) return;
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API_BASE}/ia/gerar-parecer`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: JSON.stringify({ notas: aiPrompt, modalidade: aiModalidade }) });
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
        <button onClick={openNew} className="btn-motion btn-shine flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(77,167,104,0.3)] hover:shadow-[0_0_30px_rgba(77,167,104,0.5)]">
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
              <button onClick={() => setViewMode("calendario")} className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode==="calendario" ? "bg-[var(--primary)] text-black shadow-md" : "text-[var(--text-muted)] hover:text-white"}`}><Calendar size={14} /> Calendário</button>
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
                  ) : cols.map((a, ci) => {
                    const initials = a.nome.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join("");
                    return (
                      <div key={a.id} onClick={() => { openEdit(a); }} style={{ animationDelay: `${Math.min(ci,9)*55}ms` }} className="list-pop group bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--primary)]/30 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
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
                        {(a.laudo_pdf || a.avaliacao_pdf) && (
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            {a.laudo_pdf && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); openAnexo(a.laudo_pdf, `Laudo — ${a.nome}`); }} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors">
                                <FileText size={9} /> Laudo
                              </button>
                            )}
                            {a.avaliacao_pdf && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); openAnexo(a.avaliacao_pdf, `Avaliação — ${a.nome}`); }} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors">
                                <StickyNote size={9} /> Avaliação
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-[var(--text-muted)]"><CalendarDays size={10} /> {a.data.split("-").reverse().join("/")} <Clock size={10} className="ml-1" /> {a.hora}</span>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-1.5">
                          <button onClick={(e)=>{ e.stopPropagation(); openGerenciar(a); }} className="py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-[var(--border)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                            <Settings2 size={12} /> Gerenciar
                          </button>
                          <button onClick={(e)=>{ e.stopPropagation(); setAiPrompt(`Gere um parecer para ${a.nome} da empresa ${a.empresa}.`); setAiModalidade(a.modalidade); setAiResult(null); setShowAI(true); }} className="py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                            <Sparkles size={12} /> Parecer IA
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "lista" ? (
        /* Lista moderna — sem <table>, app-style rows */
        <div className="premium-surface border border-[var(--border)] rounded-2xl overflow-hidden fade-up-delay-1">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]/70 backdrop-blur-md sticky top-0 z-10">
            <span className="font-semibold text-sm flex items-center gap-2"><List size={16} className="text-[var(--primary)]" /> {statusFilter==="todos" ? "Todos os Agendamentos" : statusFilter} <span className="text-[var(--text-muted)] font-normal">· {filteredAtendimentos.length}</span></span>
            <span className="text-xs text-[var(--text-muted)] hidden sm:flex items-center gap-1">Clique no card para editar <ChevronRight size={12} /></span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {filteredAtendimentos.map(a => {
              const s = getStatusColor(a.status);
              const initials = a.nome.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join("");
              return (
                <div key={a.id} onClick={() => { openEdit(a); }} className="group flex items-center gap-4 p-4 hover:bg-[var(--card-hover)] transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--card)] border border-[var(--border)] group-hover:border-[var(--primary)]/30 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{initials}</div>
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate group-hover:text-[var(--primary)] transition-colors">{a.nome}</div>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 truncate"><Building2 size={10} /> {a.empresa} <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" /> {a.modalidade}</div>
                      {(a.laudo_pdf || a.avaliacao_pdf) && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {a.laudo_pdf && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); openAnexo(a.laudo_pdf, `Laudo — ${a.nome}`); }} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors">
                              <FileText size={9} /> Laudo
                            </button>
                          )}
                          {a.avaliacao_pdf && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); openAnexo(a.avaliacao_pdf, `Avaliação — ${a.nome}`); }} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors">
                              <StickyNote size={9} /> Avaliação
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex sm:justify-center">
                      <div className="inline-flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-full px-3 py-1.5">
                        <CalendarDays size={12} className="text-[var(--text-muted)]" /><span className="text-xs font-semibold text-white">{a.data.split("-").reverse().join("/")}</span><span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" /><Clock size={12} className="text-[var(--text-muted)]" /><span className="text-xs text-[var(--text-muted)]">{a.hora}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.bg} ${s.text}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{a.status}</span>
                      <button onClick={(e)=>{ e.stopPropagation(); openGerenciar(a); }} className="hidden sm:inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><Settings2 size={12} /> Gerenciar</button>
                      <button onClick={(e)=>{ e.stopPropagation(); setAiPrompt(`Gere um parecer para ${a.nome} da empresa ${a.empresa}.`); setAiModalidade(a.modalidade); setAiResult(null); setShowAI(true); }} className="hidden sm:inline-flex items-center gap-1 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><Sparkles size={12} /> IA</button>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="fade-up-delay-1">
          <AppointmentCalendar appointments={filteredAtendimentos.map(a => ({ id: a.id, nome: a.nome, empresa: a.empresa, modalidade: a.modalidade, status: a.status, data: a.data, hora: a.hora }))} onSelect={(a) => { const found = filteredAtendimentos.find(x => x.id === a.id); if(found) openEdit(found); }} />
        </div>
      )}

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-[0_32px_64px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in duration-200 modal-glass modal-in">
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
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Building2 size={12} /> Convênio / Origem <span className="text-[var(--text-muted)] normal-case font-normal">(opcional)</span></label>
                  <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Particular, Unimed, SUS..." className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Abordagem / Modalidade *</label>
                  <select required value={isCustomModalidade ? "Outro" : modalidade} onChange={e => {
                    if (e.target.value === "Outro") { setModalidade("Outro"); setModalidadeCustom(""); }
                    else { setModalidade(e.target.value); setModalidadeCustom(""); }
                  }} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors appearance-none">
                    <option value="">Selecione a abordagem...</option>
                    {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="Outro">Outro (personalizado)</option>
                  </select>
                  {(modalidade === "Outro" || isCustomModalidade) && (
                    <input autoFocus required value={isCustomModalidade ? modalidade : modalidadeCustom} placeholder="Digite a modalidade personalizada..." onChange={e => {
                      const v = e.target.value;
                      setModalidadeCustom(v);
                      setModalidade(v);
                    }} className="mt-2 w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none transition-colors" />
                  )}
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
                    <option>Confirmado</option>
                    <option>Atendido</option>
                    <option>Em andamento</option>
                    <option>Concluído</option>
                    <option>Cancelado</option>
                    <option>Faltou</option>
                    <option>Reagendado</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1">🗒️ Observações</label>
                  <textarea
                    value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}
                    placeholder="Observações adicionais ou notas da IA..."
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none transition-colors resize-none"
                  />
                  {observacoes && (
                    <button type="button" onClick={limparNotasIA} className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-red-400 transition-colors">
                      <Eraser size={10} /> Limpar Notas IA
                    </button>
                  )}
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1"><FileText size={12} /> Laudo PDF</label>
                    <input
                      type="file" accept="application/pdf,.pdf"
                      onChange={e => { setLaudoFile(e.target.files?.[0] ?? null); setAnexoMsg(""); }}
                      className="w-full text-[11px] text-[var(--text-muted)] file:mr-2 file:px-2 file:py-1 file:rounded-lg file:border-0 file:bg-white/5 file:text-[11px] file:text-white file:font-semibold file:cursor-pointer cursor-pointer"
                    />
                    {laudoFile && <span className="text-[10px] text-[var(--text-muted)]">{laudoFile.name} · {(laudoFile.size / 1048576).toFixed(1)} MB</span>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1"><StickyNote size={12} /> Avaliação PDF</label>
                    <input
                      type="file" accept="application/pdf,.pdf"
                      onChange={e => { setAvalFile(e.target.files?.[0] ?? null); setAnexoMsg(""); }}
                      className="w-full text-[11px] text-[var(--text-muted)] file:mr-2 file:px-2 file:py-1 file:rounded-lg file:border-0 file:bg-white/5 file:text-[11px] file:text-white file:font-semibold file:cursor-pointer cursor-pointer"
                    />
                    {avalFile && <span className="text-[10px] text-[var(--text-muted)]">{avalFile.name} · {(avalFile.size / 1048576).toFixed(1)} MB</span>}
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => iaAnexar("laudo")} disabled={!laudoFile || iaBusy !== ""} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {iaBusy === "laudo" ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Analisar Laudo com IA
                  </button>
                  <button type="button" onClick={() => iaAnexar("aval")} disabled={!avalFile || iaBusy !== ""} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {iaBusy === "aval" ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Analisar Avaliação com IA
                  </button>
                </div>
                {(laudoRef || avalRef) && (
                  <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mr-1">Anexos:</span>
                    {laudoRef && (
                      <button type="button" onClick={() => openAnexo(laudoRef, "Laudo")} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors">
                        <FileText size={9} /> Laudo anexado
                      </button>
                    )}
                    {avalRef && (
                      <button type="button" onClick={() => openAnexo(avalRef, "Avaliação")} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors">
                        <StickyNote size={9} /> Avaliação anexada
                      </button>
                    )}
                  </div>
                )}
                {anexoMsg && <div className="col-span-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{anexoMsg}</div>}
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(77,167,104,0.25)] hover:shadow-[0_0_25px_rgba(77,167,104,0.4)] disabled:opacity-60 flex items-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal IA */}
      {showAI && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-[0_32px_64px_rgba(0,0,0,0.7)] modal-glass modal-in">
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
                    <button onClick={copyAIParecer} className="bg-[var(--primary)] text-black font-bold px-6 py-2.5 rounded-xl text-sm shadow-[0_0_15px_rgba(77,167,104,0.25)] hover:shadow-[0_0_25px_rgba(77,167,104,0.4)]">
                      Copiar Parecer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gerenciar por atendimento (paridade streamlit) */}
      {managed && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-[0_32px_64px_rgba(0,0,0,0.7)] modal-glass modal-in">
            <div className="p-5 border-b border-[var(--border)] flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarDays size={17} className="text-[var(--primary)]" /> {managed.nome}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">{managed.empresa} · {managed.data.split("-").reverse().join("/")} às {managed.hora}</p>
              </div>
              <button className="text-[var(--text-muted)] hover:text-white"><XCircle size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[var(--text-muted)]">ID #{managed.id}</span>
                <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[var(--text-muted)]">{managed.modalidade}</span>
                <StatusBadge status={managed.status} />
              </div>

              {/* Anexos: visualizar / download */}
              <div>
                <span className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-2">Anexos</span>
                {managed.laudo_pdf || managed.avaliacao_pdf ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {managed.laudo_pdf && (
                      <span className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                        <FileText size={11} /> Laudo
                        <button onClick={() => openAnexo(managed.laudo_pdf, `Laudo — ${managed.nome}`)} className="text-[10px] font-bold hover:text-white">👁</button>
                        <button onClick={() => baixarAnexo(managed.laudo_pdf, `laudo-${managed.id}.pdf`)} className="text-[10px] font-bold hover:text-white flex items-center gap-0.5"><Download size={10} /> Baixar</button>
                      </span>
                    )}
                    {managed.avaliacao_pdf && (
                      <span className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                        <StickyNote size={11} /> Avaliação
                        <button onClick={() => openAnexo(managed.avaliacao_pdf, `Avaliação — ${managed.nome}`)} className="text-[10px] font-bold hover:text-white">👁</button>
                        <button onClick={() => baixarAnexo(managed.avaliacao_pdf, `avaliacao-${managed.id}.pdf`)} className="text-[10px] font-bold hover:text-white flex items-center gap-0.5"><Download size={10} /> Baixar</button>
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Nenhum anexo neste atendimento.</p>
                )}
              </div>

              {/* Status rápido */}
              <div>
                <span className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-2">Status</span>
                <div className="flex items-center gap-2">
                  <select value={manageStatus} onChange={e => setManageStatus(e.target.value)} className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-white focus:border-[var(--primary)] focus:outline-none appearance-none">
                    <option>Agendado</option>
                    <option>Confirmado</option>
                    <option>Atendido</option>
                    <option>Em andamento</option>
                    <option>Concluído</option>
                    <option>Cancelado</option>
                    <option>Faltou</option>
                    <option>Reagendado</option>
                  </select>
                  <button onClick={salvarStatusManage} disabled={paneBusy === "status"} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5">
                    {paneBusy === "status" && <Loader2 size={12} className="animate-spin" />} Salvar status
                  </button>
                </div>
              </div>

              {/* Manutenção de dados */}
              <div>
                <span className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-2">Manutenção de Dados</span>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setManageId(null); openEdit(managed); }} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-[var(--border)] text-xs font-semibold transition-colors">
                    ✏️ Editar Dados
                  </button>
                  <button onClick={() => exportarAtendimento(managed)} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-[var(--border)] text-xs font-semibold transition-colors">
                    📝 Exportar (JSON)
                  </button>
                  <button onClick={() => { setAiPrompt(`Gere um parecer para ${managed.nome} da empresa ${managed.empresa}.`); setAiModalidade(managed.modalidade); setAiResult(null); setShowAI(true); }} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 text-xs font-semibold transition-colors">
                    🪄 Gerar Parecer IA
                  </button>
                  <button onClick={() => excluirAtendimento(managed)} disabled={paneBusy === "excluir"} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors disabled:opacity-50">
                    {paneBusy === "excluir" && <Loader2 size={12} className="animate-spin" />} 🗑️ Excluir
                  </button>
                </div>
              </div>
              {paneMsg && <div className="text-xs text-[var(--text-muted)] bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2">{paneMsg}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Viewer de PDF (Laudo/Avaliação) */}
      {pdfView && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (pdfView.url) URL.revokeObjectURL(pdfView.url); setPdfView(null); }}>
          <div onClick={e => e.stopPropagation()} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-[0_32px_64px_rgba(0,0,0,0.7)] modal-glass modal-in overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText size={16} className="text-[var(--primary)]" /> {pdfView.titulo}
              </h2>
              <button onClick={() => { if (pdfView.url) URL.revokeObjectURL(pdfView.url); setPdfView(null); }} className="text-[var(--text-muted)] hover:text-white"><XCircle size={18} /></button>
            </div>
            {pdfLoading ? (
              <div className="flex-1 flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 size={16} className="animate-spin" /> Carregando PDF...</div>
            ) : (
              <iframe src={pdfView.url} title={pdfView.titulo} className="flex-1 w-full bg-white" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
