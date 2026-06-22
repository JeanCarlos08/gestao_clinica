"use client";

import { Users, CalendarCheck, TrendingUp, Activity, Bell, Calendar as CalendarIcon, Clock, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: 'Seg', atendimentos: 4 },
  { name: 'Ter', atendimentos: 3 },
  { name: 'Qua', atendimentos: 6 },
  { name: 'Qui', atendimentos: 5 },
  { name: 'Sex', atendimentos: 8 },
  { name: 'Sáb', atendimentos: 2 },
  { name: 'Dom', atendimentos: 0 },
];

const proximasConsultas = [
  { id: 1, nome: "Carlos Almeida", tipo: "Terapia Cognitivo-Comportamental", horario: "14:00", data: "Hoje", status: "Confirmado", avatar: "https://i.pravatar.cc/150?img=11" },
  { id: 2, nome: "Marina Silva", tipo: "Primeira Sessão", horario: "15:30", data: "Hoje", status: "Pendente", avatar: "https://i.pravatar.cc/150?img=32" },
  { id: 3, nome: "Rafael Costa", tipo: "Terapia de Casal", horario: "09:00", data: "Amanhã", status: "Confirmado", avatar: "https://i.pravatar.cc/150?img=14" },
];

export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-8 w-full h-full overflow-y-auto scrollbar-hide bg-[#050a06]">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Bom dia, Juliana! ✨</h1>
          <p className="text-[var(--text-label)] font-medium">Aqui está o resumo da sua clínica hoje.</p>
        </div>
        
        {/* IA Assistant Insight Box */}
        <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl p-3 flex items-start gap-3 max-w-sm backdrop-blur-md shadow-[0_0_15px_rgba(34,197,94,0.05)] transition-all hover:bg-[var(--primary)]/15">
          <div className="bg-[var(--primary)]/20 p-2 rounded-lg text-[var(--primary)] mt-0.5">
            <Bell size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--primary)] mb-1">Insight da IA</h4>
            <p className="text-xs text-[var(--text-label)] leading-relaxed">Você tem 3 atendimentos hoje. Lembre-se de revisar o laudo do paciente <b className="text-[var(--text-muted)]">Carlos Almeida</b> pendente desde ontem.</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Pacientes Ativos" value="142" change="+12%" icon={Users} color="text-blue-400" bgColor="bg-blue-400/10" borderColor="border-blue-400/20" />
        <MetricCard title="Consultas Hoje" value="08" change="+2" icon={CalendarCheck} color="text-[var(--primary)]" bgColor="bg-[var(--primary)]/10" borderColor="border-[var(--primary)]/20" />
        <MetricCard title="Sessões na Semana" value="34" change="-1" icon={Activity} color="text-purple-400" bgColor="bg-purple-400/10" borderColor="border-purple-400/20" />
        <MetricCard title="Taxa de Presença" value="95%" change="+3%" icon={TrendingUp} color="text-amber-400" bgColor="bg-amber-400/10" borderColor="border-amber-400/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            Evolução de Atendimentos
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2e1e" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7c6b" tick={{fill: '#6b7c6b', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7c6b" tick={{fill: '#6b7c6b', fontSize: 12}} axisLine={false} tickLine={false} />
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
            {proximasConsultas.map((consulta) => (
              <div key={consulta.id} className="group p-3 rounded-xl border border-transparent hover:border-[#1e2e1e] hover:bg-[#111811] transition-all duration-300 cursor-pointer flex items-center gap-4">
                <img src={consulta.avatar} alt={consulta.nome} className="w-12 h-12 rounded-full object-cover border-2 border-[#1e2e1e] group-hover:border-[var(--primary)] transition-colors" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white mb-0.5">{consulta.nome}</h4>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1">{consulta.tipo}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-label)]">
                    <span className="flex items-center gap-1"><CalendarIcon size={12} /> {consulta.data}</span>
                    <span className="flex items-center gap-1 text-[var(--primary)] font-medium"><Clock size={12} /> {consulta.horario}</span>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${consulta.status === 'Confirmado' ? 'bg-[var(--primary)] shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'}`} title={consulta.status} />
              </div>
            ))}
          </div>
          
          <button className="mt-4 w-full py-2.5 rounded-lg border border-[#1e2e1e] text-xs font-semibold text-white hover:bg-[#111811] transition-colors">
            Adicionar Novo Atendimento
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, icon: Icon, color, bgColor, borderColor }: any) {
  const isPositive = change.startsWith('+');
  return (
    <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:border-[#243024] hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor} ${borderColor} border transition-colors group-hover:border-opacity-50`}>
          <Icon className={color} size={24} />
        </div>
        <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPositive ? 'bg-[var(--status-concluido-bg)] text-[var(--status-concluido)]' : 'bg-red-500/10 text-red-400'}`}>
          {change}
        </div>
      </div>
      <h3 className="text-[var(--text-label)] text-sm font-medium mb-1 relative z-10">{title}</h3>
      <p className="text-3xl font-extrabold text-white tracking-tight relative z-10">{value}</p>
    </div>
  );
}
