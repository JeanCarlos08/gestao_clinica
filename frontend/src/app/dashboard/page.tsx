"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { Users, CalendarCheck, TrendingUp, Activity, Bell, Calendar as CalendarIcon, Clock, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getLoggedUserProfile } from "@/lib/auth";

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

type BadgeTone = "neutral" | "positive" | "warning";

const weekdayOrder = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const AttendanceChart = dynamic<AttendanceChartProps>(() => Promise.resolve(AttendanceChartInner), { ssr: false });

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [atendimentos, setAtendimentos] = useState<AtendimentoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Usuário");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

  const fetchDashboardData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
      return;
    }

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsResponse, atendimentosResponse] = await Promise.all([
        fetch(`${API_BASE}/stats`, { headers }),
        fetch(`${API_BASE}/atendimentos`, { headers }),
      ]);

      if (statsResponse.status === 401 || atendimentosResponse.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/";
        return;
      }

      setStats(await statsResponse.json());
      setAtendimentos(await atendimentosResponse.json());
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
  const concluidos = stats?.concluidos ?? atendimentos.filter((atendimento) => atendimento.status === "Concluído").length;
  const taxaConclusao = totalAtendimentos > 0 ? Math.round((concluidos / totalAtendimentos) * 100) : 0;
  const insightPatient = upcomingConsultas[0]?.nome || "seus pacientes";

  return (
    <div className="p-4 sm:p-8 w-full h-full overflow-y-auto scrollbar-hide bg-[#050a06]">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Bom dia, {displayName}! ✨</h1>
          <p className="text-[var(--text-label)] font-medium">Aqui está o resumo da sua clínica hoje.</p>
        </div>
        
        {/* IA Assistant Insight Box */}
        <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl p-3 flex items-start gap-3 max-w-sm backdrop-blur-md shadow-[0_0_15px_rgba(34,197,94,0.05)] transition-all hover:bg-[var(--primary)]/15">
          <div className="bg-[var(--primary)]/20 p-2 rounded-lg text-[var(--primary)] mt-0.5">
            <Bell size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--primary)] mb-1">Insight da IA</h4>
            <p className="text-xs text-[var(--text-label)] leading-relaxed">Você tem {consultasHoje} atendimentos hoje. Lembre-se de revisar o laudo do paciente <b className="text-[var(--text-muted)]">{insightPatient}</b>.</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Pacientes Ativos" value={formatMetric(totalPacientes)} change="Banco" tone="neutral" icon={Users} color="text-blue-400" bgColor="bg-blue-400/10" borderColor="border-blue-400/20" />
        <MetricCard title="Consultas Hoje" value={formatMetric(consultasHoje)} change="Hoje" tone="neutral" icon={CalendarCheck} color="text-[var(--primary)]" bgColor="bg-[var(--primary)]/10" borderColor="border-[var(--primary)]/20" />
        <MetricCard title="Atendimentos do Mês" value={formatMetric(stats?.atendimentos_mes ?? 0)} change="Mês" tone="neutral" icon={Activity} color="text-purple-400" bgColor="bg-purple-400/10" borderColor="border-purple-400/20" />
        <MetricCard title="Taxa de Conclusão" value={`${taxaConclusao}%`} change="Real" tone="positive" icon={TrendingUp} color="text-amber-400" bgColor="bg-amber-400/10" borderColor="border-amber-400/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            Evolução de Atendimentos
          </h3>
          {loading && atendimentos.length === 0 ? (
            <div className="h-[300px] w-full flex items-center justify-center text-sm text-[var(--text-label)]">
              Carregando dados reais do banco...
            </div>
          ) : (
            <AttendanceChart data={chartData} />
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Próximas Consultas</h3>
            <button className="text-xs text-[var(--primary)] hover:text-white transition-colors font-medium flex items-center">
              Ver todas <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="space-y-4 flex-1">
            {upcomingConsultas.length > 0 ? upcomingConsultas.map((consulta) => (
              <div key={consulta.id} className="group p-3 rounded-xl border border-transparent hover:border-[#1e2e1e] hover:bg-[#111811] transition-all duration-300 cursor-pointer flex items-center gap-4">
                <PatientAvatar name={consulta.nome} />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-0.5">{consulta.nome}</h4>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1">{consulta.modalidade}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-label)]">
                    <span className="flex items-center gap-1"><CalendarIcon size={12} /> {consulta.dataLabel}</span>
                    <span className="flex items-center gap-1 text-[var(--primary)] font-medium"><Clock size={12} /> {consulta.horario}</span>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${consulta.status === 'Confirmado' || consulta.status === 'Concluído' ? 'bg-[var(--primary)] shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'}`} title={consulta.status} />
              </div>
            )) : (
              <div className="text-sm text-[var(--text-label)] py-4">Nenhum atendimento encontrado no banco.</div>
            )}
          </div>
          
          <button className="mt-4 w-full py-2.5 rounded-lg border border-[#1e2e1e] text-xs font-semibold text-white hover:bg-[#111811] transition-colors">
            Adicionar Novo Atendimento
          </button>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  tone?: BadgeTone;
  icon: ComponentType<{ className?: string; size?: number }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

function MetricCard({ title, value, change, tone = "neutral", icon: Icon, color, bgColor, borderColor }: MetricCardProps) {
  return (
    <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:border-[#243024] hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor} ${borderColor} border transition-colors group-hover:border-opacity-50`}>
          <Icon className={color} size={24} />
        </div>
        <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${tone === "positive" ? 'bg-[var(--status-concluido-bg)] text-[var(--status-concluido)]' : tone === "warning" ? 'bg-amber-500/10 text-amber-400' : 'bg-white/10 text-[var(--text-label)]'}`}>
          {change}
        </div>
      </div>
      <h3 className="text-[var(--text-label)] text-sm font-medium mb-1 relative z-10">{title}</h3>
      <p className="text-3xl font-extrabold text-white tracking-tight relative z-10">{value}</p>
    </div>
  );
}

function AttendanceChartInner({ data }: AttendanceChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2e1e" vertical={false} />
          <XAxis dataKey="name" stroke="#6b7c6b" tick={{ fill: '#6b7c6b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis stroke="#6b7c6b" tick={{ fill: '#6b7c6b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#111811', borderColor: '#1e2e1e', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#22c55e', fontWeight: 'bold' }}
          />
          <Line
            type="monotone"
            dataKey="atendimentos"
            stroke="#22c55e"
            strokeWidth={3}
            dot={{ fill: '#0a0f0a', stroke: '#22c55e', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff' }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface AttendanceChartProps {
  data: AttendancePoint[];
}

interface DashboardConsultationCard {
  id: number;
  nome: string;
  modalidade: string;
  dataLabel: string;
  horario: string;
  status: string;
}

function buildChartData(atendimentos: AtendimentoResumo[]): AttendancePoint[] {
  const counts = new Map(weekdayOrder.map((weekday) => [weekday, 0]));

  atendimentos.forEach((atendimento) => {
    const date = parseDateTime(atendimento.data, atendimento.hora);
    if (!Number.isNaN(date.getTime())) {
      const weekday = weekdayOrder[date.getDay()];
      counts.set(weekday, (counts.get(weekday) || 0) + 1);
    }
  });

  return weekdayOrder.map((name) => ({ name, atendimentos: counts.get(name) || 0 }));
}

function buildUpcomingConsultas(atendimentos: AtendimentoResumo[]): DashboardConsultationCard[] {
  const now = new Date();

  return [...atendimentos]
    .map((atendimento) => ({
      ...atendimento,
      timestamp: parseDateTime(atendimento.data, atendimento.hora).getTime(),
    }))
    .filter((atendimento) => atendimento.status !== "Cancelado")
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((atendimento) => atendimento.timestamp >= now.getTime() || isSameDay(atendimento.timestamp, now.getTime()))
    .slice(0, 3)
    .map((atendimento) => ({
      id: atendimento.id,
      nome: atendimento.nome,
      modalidade: atendimento.modalidade,
      dataLabel: formatDateLabel(atendimento.timestamp),
      horario: atendimento.hora,
      status: atendimento.status,
    }));
}

function parseDateTime(dateValue: string, timeValue: string): Date {
  return new Date(`${dateValue}T${timeValue}:00`);
}

function isSameDay(first: number, second: number): boolean {
  const firstDate = new Date(first);
  const secondDate = new Date(second);
  return firstDate.getFullYear() === secondDate.getFullYear()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getDate() === secondDate.getDate();
}

function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (isSameDay(timestamp, now.getTime())) {
    return "Hoje";
  }
  if (isSameDay(timestamp, tomorrow.getTime())) {
    return "Amanhã";
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getUniquePatientsCount(atendimentos: AtendimentoResumo[]): number {
  return new Set(atendimentos.map((atendimento) => atendimento.nome.trim().toLowerCase())).size;
}

function countTodayAppointments(atendimentos: AtendimentoResumo[]): number {
  const today = new Date();
  return atendimentos.filter((atendimento) => isSameDay(parseDateTime(atendimento.data, atendimento.hora).getTime(), today.getTime())).length;
}

function formatMetric(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function PatientAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="w-12 h-12 rounded-full border-2 border-[#1e2e1e] group-hover:border-[var(--primary)] transition-colors bg-gradient-to-br from-[var(--primary)]/30 to-[#111811] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      {initials || "?"}
    </div>
  );
}
