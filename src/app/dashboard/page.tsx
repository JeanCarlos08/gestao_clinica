"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import useSWR from "swr";
import {
  Users, CalendarCheck, TrendingUp, Activity, Bell, Calendar as CalendarIcon,
  Clock, ChevronRight, ArrowUpRight, Sparkles, type LucideIcon,
} from "lucide-react";
import { getLoggedUserProfile } from "@/lib/auth";
import { swrFetcher, API as API_BASE } from "@/lib/api";
import EmptyIllustration from "@/components/EmptyIllustration";

interface DashboardStats {
  total_atendimentos: number;
  total_pacientes: number;
  agendados: number;
  atendidos: number;
  concluidos: number;
  cancelados: number;
  total_empresas: number;
  atendimentos_hoje: number;
  atendimentos_mes: number;
  por_modalidade: Record<string, number>;
  por_empresa: Record<string, number>;
}

interface AtendimentoResumo {
  id: number;
  empresa: string;
  nome: string;
  modalidade: string;
  data: string;
  hora: string;
  status: string;
}

interface AttendancePoint {
  name: string;
  atendimentos: number;
}

interface AttendanceChartProps { data: AttendancePoint[]; }
interface DashboardConsultationCard {
  id: number;
  nome: string;
  modalidade: string;
  dataLabel: string;
  horario: string;
  status: string;
  photo?: string | null;
}

type BadgeTone = "neutral" | "positive" | "warning";

const weekdayOrder = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const AttendanceChart = dynamic(() => import("@/components/DashboardChart"), {
  ssr: false,
  loading: () => <div className="h-[280px] w-full flex items-center justify-center"><div className="skeleton w-full h-full rounded-xl" /></div>,
});

// ── Counter animation hook ─────────────────────────────────
function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const ref = useRef<ReturnType<typeof requestAnimationFrame>>();
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * ease));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return value;
}

export default function DashboardPage() {
  const [displayName, setDisplayName] = useState("Usuário");

  const { data, isLoading: loading } = useSWR<{ stats: DashboardStats; atendimentos: AtendimentoResumo[] }>(
    `${API_BASE}/dashboard`,
    swrFetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const stats = data?.stats ?? null;
  const atendimentos = data?.atendimentos ?? [];
  const loadingState = loading && !data;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getLoggedUserProfile(token);
    setDisplayName(user.displayName);
  }, []);

  const chartData = buildChartData(atendimentos);
  const upcomingConsultas = buildUpcomingConsultas(atendimentos);
  const totalPacientes = stats?.total_pacientes ?? getUniquePatientsCount(atendimentos);
  const totalAtendimentos = stats?.total_atendimentos ?? atendimentos.length;
  const consultasHoje = stats?.atendimentos_hoje ?? countTodayAppointments(atendimentos);
  const concluidos = stats?.concluidos ?? atendimentos.filter(a => a.status === "Concluído").length;
  const taxaConclusao = totalAtendimentos > 0 ? Math.round((concluidos / totalAtendimentos) * 100) : 0;
  const isFirstLoad = loadingState && !stats && atendimentos.length === 0;
  const insightPatient = upcomingConsultas[0]?.nome || "seus pacientes";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="p-4 sm:p-8 w-full h-full overflow-y-auto scrollbar-hide bg-transparent fade-up">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-[var(--primary)]" />
            <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-widest">Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1">
            {greeting()}, <span className="gradient-text">{displayName}</span>! ✨
          </h1>
          <p className="text-[var(--text-label)] font-medium text-sm">
            Aqui está o resumo da sua clínica hoje.
          </p>
        </div>

        {/* AI Insight */}
        <div className="bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-2xl p-4 flex items-start gap-3 max-w-sm backdrop-blur-md shadow-[0_0_20px_rgba(20,184,166,0.06)] hover:shadow-[0_0_30px_rgba(20,184,166,0.1)] transition-shadow group">
          <div className="bg-[var(--primary)]/20 p-2.5 rounded-xl text-[var(--primary)] mt-0.5 group-hover:bg-[var(--primary)]/30 transition-colors flex-shrink-0">
            <Bell size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--primary)] mb-1 flex items-center gap-1">
              <Sparkles size={10} />
              Insight da IA
            </h4>
            <p className="text-xs text-[var(--text-label)] leading-relaxed">
              Você tem <b className="text-white">{consultasHoje}</b> atendimentos hoje. Revise o laudo de{" "}
              <b className="text-[var(--primary-bright)]">{insightPatient}</b>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Metric Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">
        {isFirstLoad ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="premium-surface rounded-2xl p-5 animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="w-12 h-12 rounded-xl skeleton" />
                <div className="w-14 h-5 rounded-full skeleton" />
              </div>
              <div className="h-3 w-24 skeleton mb-3" />
              <div className="h-8 w-16 skeleton" />
            </div>
          ))
        ) : (
          <>
            <MetricCard
              title="Pacientes Ativos" value={totalPacientes} suffix="" change="Banco"
              tone="neutral" icon={Users}
              color="text-blue-400" bgColor="bg-blue-500/10" borderColor="border-blue-500/15"
              hoverClass="metric-card-blue"
            />
            <MetricCard
              title="Consultas Hoje" value={consultasHoje} suffix="" change="Hoje"
              tone="positive" icon={CalendarCheck}
              color="text-[var(--primary)]" bgColor="bg-[var(--primary)]/10" borderColor="border-[var(--primary)]/15"
              hoverClass="metric-card-green"
            />
            <MetricCard
              title="Atendimentos do Mês" value={stats?.atendimentos_mes ?? 0} suffix="" change="Mês"
              tone="neutral" icon={Activity}
              color="text-purple-400" bgColor="bg-purple-500/10" borderColor="border-purple-500/15"
              hoverClass="metric-card-purple"
            />
            <MetricCard
              title="Taxa de Conclusão" value={taxaConclusao} suffix="%" change="Real"
              tone="positive" icon={TrendingUp}
              color="text-amber-400" bgColor="bg-amber-500/10" borderColor="border-amber-500/15"
              hoverClass="metric-card-amber"
            />
          </>
        )}
      </div>

      {/* ── Chart + Upcoming ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">

        {/* Chart */}
        <div className="lg:col-span-2 premium-surface rounded-2xl p-6 relative overflow-hidden group fade-up-delay-1">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/4 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-[var(--primary)]" />
                Evolução de Atendimentos
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Distribuição por dia da semana</p>
            </div>
            <button onClick={() => window.location.href = "/relatorios"} className="text-xs text-[var(--primary)] hover:text-white transition-colors font-medium flex items-center gap-1">
              Ver detalhes <ArrowUpRight size={12} />
            </button>
          </div>
          {loadingState && atendimentos.length === 0 ? (
            <div className="h-[280px] w-full flex items-center justify-center">
              <div className="text-sm text-[var(--text-muted)]">Carregando dados...</div>
            </div>
          ) : (
            <AttendanceChart data={chartData} />
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="premium-surface rounded-2xl p-6 flex flex-col fade-up-delay-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-white">Próximas Consultas</h3>
            <button onClick={() => window.location.href = "/atendimentos"} className="text-xs text-[var(--primary)] hover:text-white transition-colors font-medium flex items-center gap-0.5">
              Ver todas <ChevronRight size={12} />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {upcomingConsultas.length > 0 ? upcomingConsultas.map((consulta) => (
              <div key={consulta.id} className="group p-3 rounded-xl border border-transparent hover:border-[var(--border-light)] hover:bg-[var(--card-hover)] transition-all duration-200 cursor-pointer flex items-center gap-3">
                <PatientAvatar name={consulta.nome} photo={consulta.photo || null} />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white mb-0.5 truncate">{consulta.nome}</h4>
                  <p className="text-xs text-[var(--text-muted)] truncate">{consulta.modalidade}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-label)]">
                    <span className="flex items-center gap-1"><CalendarIcon size={10} /> {consulta.dataLabel}</span>
                    <span className="flex items-center gap-1 text-[var(--primary)] font-semibold"><Clock size={10} /> {consulta.horario}</span>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  consulta.status === "Confirmado" || consulta.status === "Concluído"
                    ? "bg-[var(--primary)] pulse-green"
                    : "bg-amber-500 pulse-amber"
                }`} title={consulta.status} />
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <EmptyIllustration variant="appointment" size={80} />
                <p className="text-sm text-[var(--text-muted)] mt-3">Nenhum atendimento encontrado.</p>
              </div>
            )}
          </div>

          <button onClick={() => window.location.href = "/atendimentos"} className="mt-4 w-full py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-label)] hover:text-white hover:bg-[var(--card-hover)] hover:border-[var(--primary)]/30 transition-all">
            + Adicionar Novo Atendimento
          </button>
        </div>
      </div>

      {/* ── Modalidades Breakdown ─────────────────────────────── */}
      {stats && Object.keys(stats.por_modalidade).length > 0 && (
        <div className="premium-surface rounded-2xl p-6 fade-up-delay-3">
          <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <Activity size={16} className="text-[var(--primary)]" />
            Atendimentos por Modalidade
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.por_modalidade)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([mod, count], i) => {
                const pct = totalAtendimentos > 0 ? Math.round((count / totalAtendimentos) * 100) : 0;
                const colors = ["#14b8a6", "#3b82f6", "#a855f7", "#f59e0b", "#06b6d4"];
                return (
                  <div key={mod}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-white font-medium truncate pr-4">{mod}</span>
                      <span className="text-[var(--text-muted)] shrink-0">{count} ({pct}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colors[i % colors.length]}aa, ${colors[i % colors.length]})` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MetricCard ────────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: number;
  suffix: string;
  change: string;
  tone?: BadgeTone;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverClass?: string;
}

function MetricCard({ title, value, suffix, change, tone = "neutral", icon: Icon, color, bgColor, borderColor, hoverClass = "" }: MetricCardProps) {
  const animated = useCountUp(value);
  return (
    <div className={`premium-surface rounded-2xl p-4 sm:p-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative border ${borderColor} ${hoverClass} fade-up`}>
      {/* Corner glow */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-28 h-28 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgColor} border border-white/5`}>
          <Icon className={color} size={22} />
        </div>
        <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
          tone === "positive"
            ? "bg-[var(--status-concluido-bg)] text-[var(--status-concluido)] border border-[rgba(20,184,166,0.2)]"
            : "bg-white/[0.06] text-[var(--text-label)]"
        }`}>
          {change}
        </div>
      </div>
      <h3 className="text-[var(--text-label)] text-xs font-semibold mb-1.5 relative z-10 uppercase tracking-wide">{title}</h3>
      <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight relative z-10">
        {new Intl.NumberFormat("pt-BR").format(animated)}{suffix}
      </p>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function buildChartData(atendimentos: AtendimentoResumo[]): AttendancePoint[] {
  const counts = new Map(weekdayOrder.map(d => [d, 0]));
  atendimentos.forEach(a => {
    const date = new Date(`${a.data}T${a.hora}:00`);
    if (!isNaN(date.getTime())) {
      const d = weekdayOrder[date.getDay()];
      counts.set(d, (counts.get(d) || 0) + 1);
    }
  });
  return weekdayOrder.map(name => ({ name, atendimentos: counts.get(name) || 0 }));
}

function buildUpcomingConsultas(atendimentos: AtendimentoResumo[]): DashboardConsultationCard[] {
  const now = new Date();
  return [...atendimentos]
    .map(a => ({ ...a, timestamp: new Date(`${a.data}T${a.hora}:00`).getTime() }))
    .filter(a => a.status !== "Cancelado")
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter(a => a.timestamp >= now.getTime() || isSameDay(a.timestamp, now.getTime()))
    .slice(0, 4)
    .map(a => ({
      id: a.id, nome: a.nome, modalidade: a.modalidade,
      dataLabel: formatDateLabel(a.timestamp), horario: a.hora, status: a.status, photo: (a as unknown as { photo?: string }).photo,
    }));
}

function isSameDay(a: number, b: number) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function formatDateLabel(ts: number) {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(ts, now.getTime())) return "Hoje";
  if (isSameDay(ts, tomorrow.getTime())) return "Amanhã";
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getUniquePatientsCount(atendimentos: AtendimentoResumo[]) {
  return new Set(atendimentos.map(a => a.nome.trim().toLowerCase())).size;
}

function countTodayAppointments(atendimentos: AtendimentoResumo[]) {
  const today = new Date();
  return atendimentos.filter(a => isSameDay(new Date(`${a.data}T${a.hora}:00`).getTime(), today.getTime())).length;
}

function PatientAvatar({ name, photo }: { name: string; photo?: string | null }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
  if (photo) {
    return (
      <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] group-hover:border-[var(--primary)]/40 transition-colors flex-shrink-0 overflow-hidden">
        <Image src={photo} alt={name} width={40} height={40} unoptimized className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] group-hover:border-[var(--primary)]/40 transition-colors bg-gradient-to-br from-[var(--primary)]/25 to-[var(--card)] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
      {initials || "?"}
    </div>
  );
}
