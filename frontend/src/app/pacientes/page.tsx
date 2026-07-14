"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import useSWR from "swr";
import { Search, Users, CalendarClock, Activity, RefreshCw, Loader2, ChevronRight, UserPlus } from "lucide-react";

interface PacienteResumo {
  id: number;
  nome: string;
  empresa: string | null;
  total_atendimentos: number;
  ultimo_atendimento: string | null;
  status: string | null;
  modalidades_distintas: number;
  foto: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
const fetcher = async (url: string) => {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "/"; return []; }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/"; return []; }
  return res.json();
};

export default function PacientesPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 280);
    return () => clearTimeout(t);
  }, [q]);

  const { data: pacientes = [], isLoading: loading, mutate } = useSWR<PacienteResumo[]>(
    `${API_BASE}/pacientes?q=${encodeURIComponent(debouncedQ)}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const uploadPacientePhoto = async (paciente: PacienteResumo, file?: File | null) => {
    if (!file) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const slug = (paciente.nome || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/pacientes/${slug}/photo`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      if (res.ok) {
        const get = await fetch(`${API_BASE}/pacientes/${slug}/photo`, { headers: { Authorization: `Bearer ${token}` } });
        if (get.ok) {
          const j = await get.json();
          if (j.photo) mutate(curr => curr?.map(c => c.id === paciente.id ? { ...c, foto: j.photo } : c), { revalidate: false });
        }
      }
    } catch { /* ignore */ }
  };

  const totalPacientes = pacientes.length;
  const totalAtendimentos = pacientes.reduce((s, p) => s + p.total_atendimentos, 0);
  const filtered = pacientes.filter(p =>
    !q || p.nome.toLowerCase().includes(q.toLowerCase()) || (p.empresa || "").toLowerCase().includes(q.toLowerCase())
  );

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
          <p className="text-[var(--text-muted)] text-sm mt-1">Lista derivada dos atendimentos registrados</p>
        </div>
        <button
          onClick={() => mutate()}
          disabled={loading}
          className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/40 text-white px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50 hover:bg-[var(--card-hover)]"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pacientes únicos",         value: totalPacientes,     icon: <Users size={16} />,        color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/15" },
          { label: "Atendimentos vinculados",   value: totalAtendimentos,  icon: <Activity size={16} />,     color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/15" },
          { label: "Modalidades distintas",     value: pacientes.reduce((s, p) => s + p.modalidades_distintas, 0), icon: <CalendarClock size={16} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
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
      <div className="premium-surface rounded-xl p-4 mb-6 flex items-center gap-3 border border-[var(--border)] focus-within:border-[var(--primary)]/30 transition-colors">
        <Search size={16} className="text-[var(--text-muted)] flex-shrink-0" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && mutate()}
          placeholder="Buscar por nome ou empresa..."
          className="w-full bg-transparent outline-none text-sm text-white placeholder:text-[var(--text-muted)]"
        />
        {q && (
          <button onClick={() => setQ("")} className="text-[var(--text-muted)] hover:text-white text-xs">
            ✕
          </button>
        )}
      </div>

      {/* Patient Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="premium-surface rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full skeleton" />
                <div className="flex-1">
                  <div className="h-4 w-28 skeleton mb-2" />
                  <div className="h-3 w-20 skeleton" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full skeleton" />
                <div className="h-3 w-3/4 skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="premium-surface rounded-2xl p-16 text-center">
          <UserPlus size={48} className="mx-auto mb-4 text-[var(--text-muted)]/30" />
          <p className="text-[var(--text-muted)] font-medium">
            {q ? "Nenhum paciente encontrado para a busca." : "Nenhum paciente encontrado no banco."}
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Registre atendimentos para que pacientes apareçam aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((paciente, idx) => (
            <PatientCard
              key={paciente.id}
              paciente={paciente}
              onPhotoUpload={uploadPacientePhoto}
              onViewDocs={() => router.push(`/pacientes/${paciente.id}/doc-editor`)}
              delay={idx * 50}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PatientCard({
  paciente, onPhotoUpload, onViewDocs, delay
}: {
  paciente: PacienteResumo;
  onPhotoUpload: (p: PacienteResumo, f?: File | null) => void;
  onViewDocs: () => void;
  delay: number;
}) {
  const initials = paciente.nome.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
  const statusColor = paciente.status === "Ativo" || !paciente.status
    ? { dot: "bg-emerald-400 pulse-green", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" }
    : { dot: "bg-red-400", text: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };

  return (
    <div
      className="premium-surface rounded-2xl p-5 border border-[var(--border)] hover:border-[var(--border-light)] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group list-item-fade"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top: Avatar + name + status */}
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
            <input type="file" accept="image/*" className="hidden" onChange={e => onPhotoUpload(paciente, e.target.files?.[0] || null)} />
            <span className="text-black text-[8px] font-black">+</span>
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{paciente.nome}</h3>
          <p className="text-xs text-[var(--text-muted)] truncate">{paciente.empresa || "Sem empresa"}</p>
          <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor.bg} ${statusColor.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
            {paciente.status || "Ativo"}
          </span>
        </div>
      </div>

      {/* Stats row */}
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

      {/* Last attendance */}
      {paciente.ultimo_atendimento && (
        <div className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
          <CalendarClock size={11} />
          Último: {formatDate(paciente.ultimo_atendimento)}
        </div>
      )}

      {/* Action */}
      <button
        onClick={onViewDocs}
        className="w-full py-2 rounded-lg text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/30 transition-all flex items-center justify-center gap-1.5 group-hover:shadow-[0_0_12px_rgba(34,197,94,0.1)]"
      >
        Editar Documento <ChevronRight size={12} />
      </button>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}