"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import useSWR from "swr";
import {
  Search, Users, CalendarClock, Activity, RefreshCw, Loader2,
  Plus, XCircle, Edit3, Trash2, User, Phone, Mail, Building2, CreditCard, Save,
  FileText, LayoutGrid, List, NotebookPen, Star, Sparkles, Send, Clock3,
} from "lucide-react";
import EmptyIllustration from "@/components/EmptyIllustration";
import { swrFetcher, API as API_BASE } from "@/lib/api";

interface PacienteResumo {
  id: number;
  nome: string;
  slug: string;
  empresa: string | null;
  foto: string | null;
  total_atendimentos: number;
  ultimo_atendimento: string | null;
  status: string | null;
  modalidades_distintas: number;
}

interface PacienteFull {
  id: number;
  nome: string;
  slug: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  estado_civil: string | null;
  profissao: string | null;
  convenio: string | null;
  numero_convenio: string | null;
  empresa: string | null;
  endereco: string | null;
  contato_emergencia: string | null;
  telefone_emergencia: string | null;
  observacoes: string | null;
  foto: string | null;
}

const fetcher = swrFetcher;

const emptyForm = {
  nome: "", cpf: "", telefone: "", email: "", data_nascimento: "", sexo: "",
  estado_civil: "", profissao: "", convenio: "", numero_convenio: "", empresa: "",
  endereco: "", contato_emergencia: "", telefone_emergencia: "", observacoes: "",
};

export default function PacientesPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "lista">("grid");

  // ── Prontuário / Evolução (reaproveita tabela `notas`) ──
  const [showProntuario, setShowProntuario] = useState(false);
  const [prontPaciente, setProntPaciente] = useState<PacienteResumo | null>(null);
  const [evolucoes, setEvolucoes] = useState<{ id:number; titulo:string; conteudo:string; favorita:boolean; criado_em:string }[]>([]);
  const [evoLoading, setEvoLoading] = useState(false);
  const [novaEvo, setNovaEvo] = useState("");
  const [evoSaving, setEvoSaving] = useState(false);
  const [evoIAloading, setEvoIAloading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 280);
    return () => clearTimeout(t);
  }, [q]);

  const { data: pacientes = [], isLoading: loading, mutate } = useSWR<PacienteResumo[]>(
    `${API_BASE}/pacientes?q=${encodeURIComponent(debouncedQ)}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = async (paciente: PacienteResumo) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/pacientes/${paciente.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: PacienteFull = await res.json();
        setForm({
          nome: data.nome || "", cpf: data.cpf || "", telefone: data.telefone || "",
          email: data.email || "", data_nascimento: data.data_nascimento || "",
          sexo: data.sexo || "", estado_civil: data.estado_civil || "",
          profissao: data.profissao || "", convenio: data.convenio || "",
          numero_convenio: data.numero_convenio || "", empresa: data.empresa || "",
          endereco: data.endereco || "", contato_emergencia: data.contato_emergencia || "",
          telefone_emergencia: data.telefone_emergencia || "", observacoes: data.observacoes || "",
        });
        setEditingId(paciente.id);
        setShowModal(true);
      }
    } catch (e) { console.debug("Erro ao carregar paciente:", e); }
  };

  const savePaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    try {
      const url = editingId ? `${API_BASE}/pacientes/${editingId}` : `${API_BASE}/pacientes`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowModal(false); mutate(); }
    } catch (e) { console.debug("Erro ao salvar paciente:", e); alert("Erro ao salvar paciente."); }
    finally { setSaving(false); }
  };

  const deletePaciente = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este paciente?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/pacientes/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) mutate();
    } catch (e) { console.debug("Erro ao excluir paciente:", e); }
  };

  const uploadPhoto = async (paciente: PacienteResumo, file?: File | null) => {
    if (!file) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`${API_BASE}/pacientes/${paciente.id}/photo`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      mutate();
    } catch (e) { console.debug("Erro ao fazer upload de foto:", e); }
  };

  const setField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  // ── Prontuário helpers ──
  const fetchEvolucoes = async (pacienteId: number) => {
    const tk = localStorage.getItem("token");
    if (!tk) return;
    setEvoLoading(true);
    try {
      const res = await fetch(`${API_BASE}/notas?paciente_id=${pacienteId}`, { headers: { Authorization: `Bearer ${tk}` } });
      if (res.ok) setEvolucoes(await res.json());
    } catch (e) { console.debug("fetchEvolucoes", e); }
    finally { setEvoLoading(false); }
  };
  const openProntuario = (p: PacienteResumo) => {
    setProntPaciente(p); setNovaEvo(""); setShowProntuario(true); fetchEvolucoes(p.id);
  };
  const salvarEvolucao = async () => {
    if (!prontPaciente || !novaEvo.trim()) return;
    const tk = localStorage.getItem("token"); if (!tk) return;
    setEvoSaving(true);
    try {
      const res = await fetch(`${API_BASE}/notas`, { method: "POST", headers: { "Content-Type":"application/json", Authorization:`Bearer ${tk}` }, body: JSON.stringify({ paciente_id: prontPaciente.id, conteudo: novaEvo }) });
      if (res.ok) { setNovaEvo(""); fetchEvolucoes(prontPaciente.id); }
    } catch (e) { console.debug(e); alert("Erro ao salvar evolução"); }
    finally { setEvoSaving(false); }
  };
  const deletarEvolucao = async (id:number) => {
    if (!confirm("Excluir evolução?")) return;
    const tk = localStorage.getItem("token"); if (!tk) return;
    await fetch(`${API_BASE}/notas/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${tk}` } });
    if (prontPaciente) fetchEvolucoes(prontPaciente.id);
  };
  const resumirComIA = async () => {
    if (!novaEvo.trim() || !prontPaciente) return;
    const tk = localStorage.getItem("token"); if (!tk) return;
    setEvoIAloading(true);
    try {
      const res = await fetch(`${API_BASE}/ia/gerar-parecer`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${tk}` }, body: JSON.stringify({ notas: novaEvo, modalidade: "Psicologia Clínica" }) });
      if (res.ok) { const d = await res.json(); setNovaEvo(d.texto || novaEvo); }
    } catch (e) { console.debug(e); }
    finally { setEvoIAloading(false); }
  };

  const totalPacientes = pacientes.length;
  const totalAtendimentos = pacientes.reduce((s, p) => s + p.total_atendimentos, 0);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Users size={16} className="text-blue-400" />
            </div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Pacientes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Gestão de Pacientes</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Cadastre e gerencie dados dos pacientes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => mutate()} disabled={loading}
            className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/40 text-white px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50 hover:bg-[var(--card-hover)]">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button onClick={openNew}
            className="flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)]">
            <Plus size={16} strokeWidth={2.5} /> Novo Paciente
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pacientes cadastrados", value: totalPacientes, icon: <Users size={16} />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/15" },
          { label: "Atendimentos vinculados", value: totalAtendimentos, icon: <Activity size={16} />, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/15" },
          { label: "Modalidades distintas", value: pacientes.reduce((s, p) => s + p.modalidades_distintas, 0), icon: <CalendarClock size={16} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
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

      {/* Search + View Toggle — app moderno */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 premium-surface rounded-xl p-3 flex items-center gap-3 border border-[var(--border)] focus-within:border-[var(--primary)]/30 transition-colors">
          <Search size={16} className="text-[var(--text-muted)] flex-shrink-0 ml-1" />
          <input type="text" value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && mutate()}
            placeholder="Buscar por nome, empresa ou CPF..."
            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-[var(--text-muted)]" />
          {q && <button onClick={() => setQ("")} className="text-[var(--text-muted)] hover:text-white text-xs p-1">✕</button>}
        </div>
        <div className="flex items-center gap-2">
          <div className="premium-surface rounded-xl p-1 flex items-center gap-1 border border-[var(--border)]">
            <button onClick={() => setViewMode("grid")} className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode==="grid" ? "bg-[var(--primary)] text-black shadow-md" : "text-[var(--text-muted)] hover:text-white"}`}><LayoutGrid size={14} /> Grid</button>
            <button onClick={() => setViewMode("lista")} className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode==="lista" ? "bg-[var(--primary)] text-black shadow-md" : "text-[var(--text-muted)] hover:text-white"}`}><List size={14} /> Lista</button>
          </div>
          <span className="hidden sm:flex text-xs text-[var(--text-muted)]">{pacientes.length} pacientes</span>
        </div>
      </div>

      {/* Patient Views */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="premium-surface rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full skeleton" />
                <div className="flex-1"><div className="h-4 w-28 skeleton mb-2" /><div className="h-3 w-20 skeleton" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : pacientes.length === 0 ? (
        <div className="premium-surface rounded-2xl p-16 text-center">
          <EmptyIllustration variant="search" size={110} />
          <p className="text-[var(--text-muted)] font-medium mt-4">
            {q ? "Nenhum paciente encontrado para a busca." : "Nenhum paciente cadastrado."}
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Clique em &quot;Novo Paciente&quot; para cadastrar.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pacientes.map((paciente, idx) => (
            <PatientCard
              key={paciente.id} paciente={paciente} delay={idx * 30}
              onPhoto={uploadPhoto} onEdit={openEdit} onDelete={deletePaciente}
              onViewDocs={() => router.push(`/pacientes/${paciente.id}/doc-editor`)}
              onProntuario={() => openProntuario(paciente)}
            />
          ))}
        </div>
      ) : (
        <div className="premium-surface border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {pacientes.map(paciente => {
              const initials = paciente.nome.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join("");
              return (
                <div key={paciente.id} className="group flex items-center gap-4 p-4 hover:bg-[var(--card-hover)] transition-colors">
                  <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] group-hover:border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--card)] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
                    {paciente.foto ? <Image src={paciente.foto} alt={paciente.nome} width={40} height={40} unoptimized className="w-full h-full object-cover" /> : initials}
                  </div>
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 items-center">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate group-hover:text-[var(--primary)] transition-colors">{paciente.nome}</div>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 truncate"><Building2 size={10} /> {paciente.empresa || "Sem empresa"}</div>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-center">
                      <span className="inline-flex items-center gap-1 bg-[var(--background)] border border-[var(--border)] rounded-full px-2.5 py-1 text-xs"><Activity size={10} className="text-[var(--text-muted)]" />{paciente.total_atendimentos} atends.</span>
                      <span className="hidden sm:inline-flex items-center gap-1 bg-[var(--background)] border border-[var(--border)] rounded-full px-2.5 py-1 text-xs text-[var(--text-muted)]"><CalendarClock size={10} />{paciente.ultimo_atendimento ? formatDate(paciente.ultimo_atendimento) : "—"}</span>
                    </div>
                     <div className="flex items-center justify-between sm:justify-end gap-2">
                      <span className="text-xs font-bold text-white bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2.5 py-1 rounded-full">{paciente.modalidades_distintas} mods</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openProntuario(paciente)} title="Prontuário" className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"><NotebookPen size={14} /></button>
                        <button onClick={() => openEdit(paciente)} className="p-2 rounded-lg bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/20 transition-colors"><Edit3 size={14} /></button>
                        <button onClick={() => router.push(`/pacientes/${paciente.id}/doc-editor`)} className="hidden sm:inline-flex p-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 transition-colors"><FileText size={14} /></button>
                        <button onClick={() => deletePaciente(paciente.id)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_32px_64px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--card)] z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingId ? <><Edit3 size={18} className="text-[var(--primary)]" /> Editar Paciente</> : <><Plus size={18} className="text-[var(--primary)]" /> Novo Paciente</>}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-white"><XCircle size={20} /></button>
            </div>
            <form onSubmit={savePaciente} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1"><User size={12} /> Nome *</label>
                  <input required value={form.nome} onChange={e => setField("nome", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1"><CreditCard size={12} /> CPF</label>
                  <input value={form.cpf} onChange={e => setField("cpf", e.target.value)} placeholder="000.000.000-00"
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Phone size={12} /> Telefone</label>
                  <input value={form.telefone} onChange={e => setField("telefone", e.target.value)} placeholder="(00) 00000-0000"
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Mail size={12} /> Email</label>
                  <input type="email" value={form.email} onChange={e => setField("email", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Data de Nascimento</label>
                  <input type="date" value={form.data_nascimento} onChange={e => setField("data_nascimento", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Sexo</label>
                  <select value={form.sexo} onChange={e => setField("sexo", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors appearance-none">
                    <option value="">Não informado</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Estado Civil</label>
                  <select value={form.estado_civil} onChange={e => setField("estado_civil", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors appearance-none">
                    <option value="">Não informado</option>
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="União estável">União estável</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Building2 size={12} /> Empresa</label>
                  <input value={form.empresa} onChange={e => setField("empresa", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Profissão</label>
                  <input value={form.profissao} onChange={e => setField("profissao", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Convênio</label>
                  <input value={form.convenio} onChange={e => setField("convenio", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Nº Convênio</label>
                  <input value={form.numero_convenio} onChange={e => setField("numero_convenio", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Endereço</label>
                  <input value={form.endereco} onChange={e => setField("endereco", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Contato de Emergência</label>
                  <input value={form.contato_emergencia} onChange={e => setField("contato_emergencia", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Tel. Emergência</label>
                  <input value={form.telefone_emergencia} onChange={e => setField("telefone_emergencia", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-1.5">Observações</label>
                  <textarea rows={3} value={form.observacoes} onChange={e => setField("observacoes", e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[var(--primary)] focus:outline-none transition-colors resize-none" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(20,184,166,0.25)] disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Prontuário / Evoluções - reaproveita tabela notas */}
      {showProntuario && prontPaciente && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_32px_64px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--card)] z-10 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <NotebookPen size={18} className="text-emerald-400" /> Prontuário — {prontPaciente.nome}
              </h2>
              <button onClick={() => setShowProntuario(false)} className="text-[var(--text-muted)] hover:text-white"><XCircle size={20} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Nova evolução */}
              <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4">
                <label className="block text-[11px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-2 flex items-center gap-1"><NotebookPen size={12} /> Nova evolução (sigilosa)</label>
                <textarea value={novaEvo} onChange={e => setNovaEvo(e.target.value)} rows={4} placeholder="Ex: Paciente relatou melhora no sono, mantém ansiedade em crises... (SOAP livre)" className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-emerald-500/50 focus:outline-none resize-none" />
                <div className="flex gap-2 mt-3">
                  <button onClick={resumirComIA} disabled={evoIAloading || !novaEvo.trim()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 text-xs font-semibold disabled:opacity-40 transition-colors">
                    {evoIAloading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Lapidar com IA
                  </button>
                  <div className="flex-1" />
                  <button onClick={salvarEvolucao} disabled={evoSaving || !novaEvo.trim()} className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-40 transition-colors">
                    {evoSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Salvar evolução
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-2">Armazenado na tabela <code>notas</code> com tag <code>paciente:{prontPaciente.id}</code> — sigiloso, LGPD ok.</p>
              </div>

              {/* Timeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[var(--text-label)] uppercase tracking-wider flex items-center gap-1"><Clock3 size={12} /> Timeline ({evolucoes.length})</h3>
                  <button onClick={() => fetchEvolucoes(prontPaciente.id)} className="text-xs text-[var(--text-muted)] hover:text-white inline-flex items-center gap-1"><RefreshCw size={12} /> Atualizar</button>
                </div>
                {evoLoading ? (
                  <div className="text-center py-8 text-sm text-[var(--text-muted)] flex flex-col items-center gap-2"><Loader2 size={20} className="animate-spin text-emerald-400" /> Carregando evoluções...</div>
                ) : evolucoes.length === 0 ? (
                  <div className="premium-surface rounded-xl p-8 text-center border border-dashed border-[var(--border)]">
                    <NotebookPen size={28} className="mx-auto text-[var(--text-muted)] mb-2 opacity-50" />
                    <p className="text-sm text-[var(--text-muted)]">Nenhuma evolução registrada.</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">A primeira evolução cria o prontuário do paciente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {evolucoes.map(evo => (
                      <div key={evo.id} className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-light)] transition-colors group">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="text-xs font-bold text-white flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" /> {evo.titulo}</div>
                          <div className="flex items-center gap-1">
                            {evo.favorita && <Star size={12} className="text-amber-400 fill-amber-400" />}
                            <span className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--card)] border border-[var(--border)] px-1.5 py-0.5 rounded">{new Date(evo.criado_em).toLocaleString("pt-BR")}</span>
                            <button onClick={() => deletarEvolucao(evo.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-red-400 transition-all"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <div className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{evo.conteudo}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientCard({ paciente, onPhoto, onEdit, onDelete, onViewDocs, onProntuario, delay }: {
  paciente: PacienteResumo;
  onPhoto: (p: PacienteResumo, f?: File | null) => void;
  onEdit: (p: PacienteResumo) => void;
  onDelete: (id: number) => void;
  onViewDocs: () => void;
  onProntuario: () => void;
  delay: number;
}) {
  const initials = paciente.nome.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");

  return (
    <div className="premium-surface rounded-2xl p-5 border border-[var(--border)] hover:border-[var(--border-light)] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group list-item-fade"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] group-hover:border-[var(--primary)]/30 transition-colors overflow-hidden bg-gradient-to-br from-[var(--primary)]/20 to-[var(--card)] flex items-center justify-center">
            {paciente.foto ? (
              <Image src={paciente.foto} alt={paciente.nome} width={48} height={48} unoptimized className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-sm">{initials}</span>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center cursor-pointer shadow-md hover:bg-[var(--primary-hover)] transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={e => onPhoto(paciente, e.target.files?.[0] || null)} />
            <span className="text-black text-[8px] font-black">+</span>
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{paciente.nome}</h3>
          <p className="text-xs text-[var(--text-muted)] truncate">{paciente.empresa || "Sem empresa"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-[var(--background)] rounded-lg p-2.5 text-center">
          <div className="text-xs text-[var(--text-muted)] mb-0.5">Atendimentos</div>
          <div className="text-lg font-extrabold text-white">{paciente.total_atendimentos}</div>
        </div>
        <div className="bg-[var(--background)] rounded-lg p-2.5 text-center">
          <div className="text-xs text-[var(--text-muted)] mb-0.5">Modalidades</div>
          <div className="text-lg font-extrabold text-white">{paciente.modalidades_distintas}</div>
        </div>
      </div>

      {paciente.ultimo_atendimento && (
        <div className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
          <CalendarClock size={11} /> Último: {formatDate(paciente.ultimo_atendimento)}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onProntuario}
          className="flex-1 py-2 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5">
          <NotebookPen size={12} /> Prontuário
        </button>
        <button onClick={() => onEdit(paciente)}
          className="flex-1 py-2 rounded-lg text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-all flex items-center justify-center gap-1.5">
          <Edit3 size={12} /> Editar
        </button>
        <button onClick={() => onDelete(paciente.id)}
          className="py-2 px-3 rounded-lg text-xs font-semibold text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all flex items-center justify-center">
          <Trash2 size={12} />
        </button>
      </div>
      <button onClick={onViewDocs} className="mt-2 w-full py-2 rounded-lg text-xs font-semibold text-violet-400 border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-all flex items-center justify-center gap-1.5">
        <FileText size={12} /> Documentos
      </button>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}
