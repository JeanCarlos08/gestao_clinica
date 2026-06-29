"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import {
  Bell, Search, Pencil, Trash2, Calendar as CalendarIcon,
  Moon, ChevronRight, CheckCircle2, Clock, AlertCircle,
  ClipboardList, Loader2, X, Plus, Wand2, Copy, List
} from "lucide-react";

interface Atendimento {
  id: number;
  empresa: string;
  nome: string;
  modalidade: string;
  status: string;
  data: string;
  hora: string;
}

interface FormData {
  empresa: string;
  nome: string;
  modalidade: string;
  data: string;
  hora: string;
  status: string;
}

const defaultFormData: FormData = {
  empresa: "",
  nome: "",
  modalidade: "",
  data: "",
  hora: "",
  status: "Agendado",
};

export default function AtendimentosPage() {
  const router = useRouter();
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states (CRUD)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  // Modal states (AI)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Toast
  const [toast, setToast] = useState<{type: "success"|"error", msg: string} | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

  const fetchAtendimentos = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/atendimentos`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/"); return;
      }
      const data = await response.json();
      setAtendimentos(data);
    } catch (err) {
      console.error("Erro ao buscar atendimentos:", err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, router]);

  useEffect(() => { fetchAtendimentos(); }, [fetchAtendimentos]);

  const showToast = (type: "success"|"error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedId(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (atendimento: Atendimento) => {
    setModalMode("edit");
    setSelectedId(atendimento.id);
    setFormData({
      empresa: atendimento.empresa,
      nome: atendimento.nome,
      modalidade: atendimento.modalidade,
      data: atendimento.data,
      hora: atendimento.hora,
      status: atendimento.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(defaultFormData);
    setSelectedId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    setSaving(true);
    try {
      const url = modalMode === "create" ? `${API_BASE}/atendimentos` : `${API_BASE}/atendimentos/${selectedId}`;
      const method = modalMode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      showToast("success", `Atendimento ${modalMode === "create" ? "criado" : "atualizado"} com sucesso!`);
      closeModal();
      fetchAtendimentos();
    } catch {
      showToast("error", "Erro ao salvar atendimento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este atendimento?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/atendimentos/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Erro ao excluir");
      showToast("success", "Atendimento excluído.");
      fetchAtendimentos();
    } catch { showToast("error", "Erro ao excluir atendimento."); }
  };

  const handleGenerateAi = async () => {
    if (!aiNotes.trim()) {
      showToast("error", "Digite algumas anotações para gerar o parecer.");
      return;
    }
    const token = localStorage.getItem("token");
    setIsGeneratingAi(true);
    setAiResult("");
    try {
      const res = await fetch(`${API_BASE}/ia/gerar-parecer`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ notas: aiNotes, modalidade: "Psicologia Clínica" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro na IA");
      setAiResult(data.texto);
      showToast("success", "Parecer gerado com sucesso!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao gerar parecer.";
      showToast("error", message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiResult);
    showToast("success", "Texto copiado para a área de transferência!");
  };

  const totalConcluidos = atendimentos.filter(a => a.status === "Concluído").length;
  const totalAndamento = atendimentos.filter(a => a.status === "Em andamento" || a.status === "Agendado").length;
  const totalPendentes = atendimentos.filter(a => a.status === "Pendente" || a.status === "Cancelado").length;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide relative">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg flex items-center gap-2 shadow-xl z-50 text-white font-medium ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Top Nav */}
      <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-3 mb-6 sm:mb-8">
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input type="text" placeholder="Pesquisar atendimentos..." className="w-full sm:w-64 bg-[var(--card)] border border-[var(--border)] rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--primary)] text-white" />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button className="text-[var(--text-muted)] hover:text-white transition-colors relative"><Bell size={20} /><span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span></button>
          <button className="text-[var(--text-muted)] hover:text-white transition-colors hidden sm:block"><Moon size={20} /></button>
          <Image src="https://i.pravatar.cc/150?img=5" alt="Avatar" width={32} height={32} className="w-8 h-8 rounded-full border border-[var(--border)] object-cover" />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-[var(--primary)]/10 text-[var(--primary)] p-2 rounded-lg"><ClipboardList size={24} /></div>
          <h1 className="text-2xl font-bold">Atendimentos</h1>
        </div>
        <p className="text-[var(--text-muted)] text-sm">Gerenciamento de Consultas e Procedimentos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] relative overflow-hidden">
          <div className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider mb-2">Total</div>
          <div className="text-3xl font-bold text-[var(--primary)] mb-1">{atendimentos.length}</div>
        </div>
        <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] relative">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">Concluídos</div>
            <div className="w-8 h-8 rounded-full border-2 border-[var(--status-concluido)] flex items-center justify-center text-[var(--status-concluido)]"><CheckCircle2 size={16} /></div>
          </div>
          <div className="text-3xl font-bold mb-1">{totalConcluidos}</div>
        </div>
        <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] relative">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">Em Andamento</div>
            <div className="w-8 h-8 rounded-full border-2 border-[var(--status-andamento)] flex items-center justify-center text-[var(--status-andamento)]"><Clock size={16} /></div>
          </div>
          <div className="text-3xl font-bold mb-1">{totalAndamento}</div>
        </div>
        <div className="bg-[var(--card)] p-5 rounded-xl border border-[var(--border)] relative">
          <div className="flex justify-between items-start mb-2">
            <div className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">Pendentes/Canc.</div>
            <div className="w-8 h-8 rounded-full border-2 border-[var(--status-pendente)] flex items-center justify-center text-[var(--status-pendente)]"><AlertCircle size={16} /></div>
          </div>
          <div className="text-3xl font-bold mb-1">{totalPendentes}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
        <button onClick={openCreateModal} className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--card-hover)] p-4 rounded-xl flex items-center justify-between group transition-all text-left">
          <div className="flex items-center gap-4">
            <div className="text-[var(--primary)] bg-[var(--primary)]/10 p-2 rounded-lg"><Plus size={20}/></div>
            <div>
              <div className="text-sm font-semibold text-white mb-0.5">Cadastrar Novo Atendimento</div>
              <div className="text-xs text-[var(--text-muted)]">Adicionar um novo registro ao sistema</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
        </button>
        <button onClick={() => setIsAiModalOpen(true)} className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--card-hover)] p-4 rounded-xl flex items-center justify-between group transition-all text-left">
          <div className="flex items-center gap-4">
            <div className="text-purple-400 bg-purple-500/10 p-2 rounded-lg"><Wand2 size={20}/></div>
            <div>
              <div className="text-sm font-semibold text-white mb-0.5">Gerador de Parecer (IA)</div>
              <div className="text-xs text-[var(--text-muted)]">Crie textos clínicos a partir de anotações soltas</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
        </button>
      </div>

      {/* View toggle + Calendar / List */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "list" ? "bg-[var(--primary)] text-black" : "text-[var(--text-muted)] hover:text-white"}`}
          >
            <List size={14} /> Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "calendar" ? "bg-[var(--primary)] text-black" : "text-[var(--text-muted)] hover:text-white"}`}
          >
            <CalendarIcon size={14} /> Calendário
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="mb-6">
          <AppointmentCalendar
            appointments={atendimentos}
            onSelect={(a) => openEditModal(a)}
          />
        </div>
      ) : (
      /* Table */
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex justify-between items-center">
          <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
            <ClipboardList size={18} className="text-[var(--primary)]" /> Lista de Atendimentos
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider">
              <th className="p-4 font-medium w-12">#</th>
              <th className="p-4 font-medium">Empresa</th>
              <th className="p-4 font-medium w-48">Paciente</th>
              <th className="p-4 font-medium w-32">Modalidade</th>
              <th className="p-4 font-medium w-32">Data/Hora</th>
              <th className="p-4 font-medium w-32">Status</th>
              <th className="p-4 font-medium w-32 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-10 text-center text-[var(--text-muted)]"><Loader2 className="animate-spin mx-auto" size={24} /></td></tr>
            ) : atendimentos.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-[var(--text-muted)]">Nenhum atendimento cadastrado.</td></tr>
            ) : (
              atendimentos.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors group">
                  <td className="p-4 text-xs text-[var(--text-muted)]">{a.id}</td>
                  <td className="p-4 text-[13px] font-semibold text-white max-w-[150px] truncate">{a.empresa}</td>
                  <td className="p-4 text-xs text-[var(--text-muted)] max-w-[150px] truncate">{a.nome}</td>
                  <td className="p-4 text-[13px] text-white">{a.modalidade}</td>
                  <td className="p-4 text-[13px] text-[var(--text-muted)]">
                    {a.data ? a.data.split("-").reverse().join("/") : ""} {a.hora}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold
                      ${a.status === 'Concluído' ? 'bg-[var(--status-concluido-bg)] text-[var(--status-concluido)]' : ''}
                      ${a.status === 'Em andamento' || a.status === 'Agendado' ? 'bg-[var(--status-andamento-bg)] text-[var(--status-andamento)]' : ''}
                      ${a.status === 'Pendente' || a.status === 'Cancelado' ? 'bg-[var(--status-pendente-bg)] text-[var(--status-pendente)]' : ''}
                    `}>
                      {a.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openEditModal(a)} className="text-[var(--text-muted)] hover:text-white transition-colors" title="Editar"><Pencil size={16}/></button>
                      <button onClick={() => handleDelete(a.id)} className="text-red-500 opacity-70 hover:opacity-100 transition-opacity" title="Excluir"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-[var(--border)]">
          {loading ? (
            <div className="p-10 text-center text-[var(--text-muted)]"><Loader2 className="animate-spin mx-auto" size={24} /></div>
          ) : atendimentos.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-muted)] text-sm">Nenhum atendimento cadastrado.</div>
          ) : (
            atendimentos.map((a) => (
              <div key={a.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{a.nome}</div>
                    <div className="text-xs text-[var(--text-muted)] truncate">{a.empresa}</div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0
                    ${a.status === 'Concluído' ? 'bg-[var(--status-concluido-bg)] text-[var(--status-concluido)]' : ''}
                    ${a.status === 'Em andamento' || a.status === 'Agendado' ? 'bg-[var(--status-andamento-bg)] text-[var(--status-andamento)]' : ''}
                    ${a.status === 'Pendente' || a.status === 'Cancelado' ? 'bg-[var(--status-pendente-bg)] text-[var(--status-pendente)]' : ''}
                  `}>{a.status}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span>{a.modalidade}</span>
                  <span>{a.data ? a.data.split("-").reverse().join("/") : ""} {a.hora}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => openEditModal(a)} className="flex-1 py-2 text-xs font-medium rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">Editar</button>
                  <button onClick={() => handleDelete(a.id)} className="py-2 px-4 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">Excluir</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--background)]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {modalMode === "create" ? <Plus size={20} className="text-[var(--primary)]"/> : <Pencil size={20} className="text-[var(--primary)]"/>}
                {modalMode === "create" ? "Novo Atendimento" : "Editar Atendimento"}
              </h2>
              <button onClick={closeModal} className="text-[var(--text-muted)] hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">Empresa/Convênio</label>
                  <input required type="text" value={formData.empresa} onChange={e=>setFormData({...formData, empresa: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[var(--primary)]" placeholder="Ex: Unimed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">Nome do Paciente</label>
                  <input required type="text" value={formData.nome} onChange={e=>setFormData({...formData, nome: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[var(--primary)]" placeholder="Nome completo" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">Modalidade</label>
                  <select required value={formData.modalidade} onChange={e=>setFormData({...formData, modalidade: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[var(--primary)]">
                    <option value="">Selecione...</option>
                    <option value="Psicologia Clínica">Psicologia Clínica</option>
                    <option value="Avaliação Neuropsicológica">Avaliação Neuropsicológica</option>
                    <option value="Terapia de Casal">Terapia de Casal</option>
                    <option value="Psiquiatria">Psiquiatria</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">Status</label>
                  <select required value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[var(--primary)]">
                    <option value="Agendado">Agendado</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">Data</label>
                  <input required type="date" value={formData.data} onChange={e=>setFormData({...formData, data: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">Hora</label>
                  <input required type="time" value={formData.hora} onChange={e=>setFormData({...formData, hora: e.target.value})} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[var(--primary)]" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:opacity-50">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? "Salvando..." : "Salvar Atendimento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal IA */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--background)]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wand2 size={20} className="text-purple-400"/> Gerador de Parecer Clínico (IA Gemini)
              </h2>
              <button onClick={() => setIsAiModalOpen(false)} className="text-[var(--text-muted)] hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">Anotações Brutas da Sessão</label>
                <textarea 
                  rows={4}
                  value={aiNotes}
                  onChange={e => setAiNotes(e.target.value)}
                  placeholder="Ex: paciente relatou ansiedade forte no trabalho, dificuldade de dormir, chorou ao falar da mãe..."
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex justify-end mb-6">
                <button 
                  onClick={handleGenerateAi} 
                  disabled={isGeneratingAi || !aiNotes.trim()} 
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  {isGeneratingAi ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  {isGeneratingAi ? "Processando com IA..." : "Gerar Parecer"}
                </button>
              </div>

              {aiResult && (
                <div className="mt-4 pt-6 border-t border-[var(--border)]">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider">Parecer Clínico Gerado</label>
                    <button onClick={copyToClipboard} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                      <Copy size={14} /> Copiar
                    </button>
                  </div>
                  <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4 text-sm text-white whitespace-pre-wrap leading-relaxed">
                    {aiResult}
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
