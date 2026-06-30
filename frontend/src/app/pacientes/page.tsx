"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Users, CalendarClock, Activity, RefreshCw, Loader2 } from "lucide-react";

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

const PAC_CACHE_KEY = "pacientes_cache";
const PAC_CACHE_TTL = 30_000; // 30s — atualiza em background

export default function PacientesPage() {
  const router = useRouter();
  const [pacientes, setPacientes] = useState<PacienteResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

  const fetchPacientes = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push('/'); return; }

    // Mostra cache imediatamente quando não há query de busca
    if (!debouncedQ) {
      try {
        const cached = localStorage.getItem(PAC_CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached) as { data: PacienteResumo[]; ts: number };
          if (Date.now() - ts < PAC_CACHE_TTL) {
            setPacientes(data);
            setLoading(false);
          }
        }
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch(`${API_BASE}/pacientes?q=${encodeURIComponent(debouncedQ)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) { localStorage.removeItem('token'); router.push('/'); return; }
      const data = await res.json() as PacienteResumo[];
      setPacientes(data);
      if (!debouncedQ) localStorage.setItem(PAC_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, debouncedQ, router]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQ(q), 280);
    return () => clearTimeout(timeout);
  }, [q]);

  const uploadPacientePhoto = async (paciente: PacienteResumo, file?: File | null) => {
    if (!file) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const slug = (paciente.nome || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/pacientes/${slug}/photo`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      if (res.ok) {
        const get = await fetch(`${API_BASE}/pacientes/${slug}/photo`, { headers: { Authorization: `Bearer ${token}` } });
        if (get.ok) {
          const j = await get.json();
          if (j.photo) {
            // update local state
            setPacientes(curr => curr.map(c => c.id === paciente.id ? { ...c, foto: j.photo } : c));
          }
        }
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  const totalPacientes = pacientes.length;
  const totalAtendimentos = pacientes.reduce((sum, paciente) => sum + paciente.total_atendimentos, 0);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide fade-up">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-[var(--primary)]/10 text-[var(--primary)] p-2 rounded-lg"><Users size={24} /></div>
            <h1 className="text-2xl font-bold">Pacientes</h1>
          </div>
          <p className="text-[var(--text-muted)] text-sm">Lista real derivada dos atendimentos salvos no banco</p>
        </div>
        <button
          onClick={fetchPacientes}
          className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] text-white px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
          disabled={loading}
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            <span>Atualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Pacientes únicos" value={totalPacientes} icon={<Users size={18} />} />
        <SummaryCard label="Atendimentos vinculados" value={totalAtendimentos} icon={<Activity size={18} />} />
        <SummaryCard label="Busca atual" value={q.trim() ? 1 : 0} icon={<Search size={18} />} />
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sm:p-5 mb-6 flex items-center gap-3">
        <Search size={16} className="text-[var(--text-muted)] flex-shrink-0" />
        <input
          type="text"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && fetchPacientes()}
          placeholder="Buscar por nome, empresa, CPF ou e-mail"
          className="w-full bg-transparent outline-none text-sm text-white placeholder:text-[var(--text-muted)]"
        />
      </div>

      <div className="premium-surface rounded-xl overflow-hidden fade-up">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="font-semibold text-sm flex items-center gap-2"><CalendarClock size={16} className="text-[var(--primary)]" /> Pacientes do banco</div>
          <div className="text-xs text-[var(--text-muted)]">{loading ? "Carregando..." : `${pacientes.length} registro(s)`}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider">
                <th className="p-4 font-medium">Paciente</th>
                <th className="p-4 font-medium">Empresa</th>
                <th className="p-4 font-medium">Atendimentos</th>
                <th className="p-4 font-medium">Último atendimento</th>
                <th className="p-4 font-medium">Modalidades</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[var(--text-muted)]">
                    <Loader2 className="animate-spin mx-auto" size={24} />
                  </td>
                </tr>
              ) : pacientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-[var(--text-muted)] text-sm">
                    Nenhum paciente encontrado no banco.
                  </td>
                </tr>
              ) : pacientes.map((paciente) => (
                <tr key={paciente.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[var(--primary)]/30 to-[#111811] flex items-center justify-center">
                        {paciente.foto ? (
                          <Image
                            src={paciente.foto}
                            alt={paciente.nome}
                            width={48}
                            height={48}
                            unoptimized
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          paciente.nome.split(" ").slice(0,2).map((p:string)=>p[0]?.toUpperCase()).join("")
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="font-semibold text-white">{paciente.nome}</div>
                        <div className="text-xs text-[var(--text-muted)]">ID #{paciente.id}</div>
                        <label className="text-xs text-[var(--text-muted)] mt-1 inline-block cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={e=>uploadPacientePhoto(paciente, e.target.files?.[0]||null)} />
                          <span className="underline">Enviar foto</span>
                        </label>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-[var(--text-muted)]">{paciente.empresa || "—"}</td>
                  <td className="p-4 text-sm text-white">{paciente.total_atendimentos}</td>
                  <td className="p-4 text-sm text-[var(--text-muted)]">{formatDate(paciente.ultimo_atendimento)}</td>
                  <td className="p-4 text-sm text-white">{paciente.modalidades_distintas}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--status-concluido-bg)] text-[var(--status-concluido)]">
                      {paciente.status || "Ativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[var(--text-label)] text-xs uppercase tracking-wider font-semibold">{label}</div>
        <div className="text-[var(--primary)]">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}