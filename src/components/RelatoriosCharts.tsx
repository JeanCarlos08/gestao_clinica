"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import EmptyIllustration from "@/components/EmptyIllustration";
import { TrendingUp, Users, FileText, Building2 } from "lucide-react";

interface ReportStats {
  total: number;
  por_status: Record<string, number>;
  por_modalidade: Record<string, number>;
  por_empresa: Record<string, number>;
  por_mes: Record<string, number>;
}
const STATUS_COLORS: Record<string, string> = {
  "Concluído": "#14b8a6", "Atendido": "#3b82f6",
  "Agendado": "#f59e0b", "Cancelado": "#ef4444",
  "Pendente": "#f97316", "Em andamento": "#a855f7",
};
const COLORS = ["#14b8a6", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

export default function RelatoriosCharts({ stats, total }: { stats: ReportStats; total: number }) {
  const mesData = Object.entries(stats.por_mes).map(([mes, c]) => {
    const [, m] = mes.split("-");
    return { name: `${m}/${mes.slice(2, 4)}`, value: c };
  });
  const statusData = Object.entries(stats.por_status).map(([name, value]) => ({ name, value }));
  const maxEmp = Math.max(...Object.values(stats.por_empresa), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="premium-surface border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 font-semibold mb-5 text-sm">
            <TrendingUp size={16} className="text-[var(--primary)]" /> Atendimentos por Mês
          </div>
          {mesData.length === 0 ? (
            <div className="text-center py-10">
              <EmptyIllustration variant="report" size={80} />
              <p className="text-[var(--text-muted)] text-sm mt-3">Nenhum dado no período.</p>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mesData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="#3d5554" tick={{ fill: "#6b8e8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#3d5554" tick={{ fill: "#6b8e8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(8,15,9,0.95)", borderColor: "rgba(20,184,166,0.2)", borderRadius: "10px", color: "#fff" }} itemStyle={{ color: "#2dd4bf" }} />
                  <Bar dataKey="value" fill="#14b8a6" radius={[6, 6, 0, 0]} fillOpacity={0.85} name="Atendimentos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="premium-surface border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 font-semibold mb-5 text-sm">
            <Users size={16} className="text-[var(--primary)]" /> Distribuição por Status
          </div>
          {statusData.length === 0 ? (
            <div className="text-center py-10">
              <EmptyIllustration variant="report" size={70} />
              <p className="text-[var(--text-muted)] text-sm mt-3">Sem dados.</p>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} fillOpacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "rgba(8,15,9,0.95)", borderColor: "rgba(20,184,166,0.2)", borderRadius: "10px", color: "#fff" }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "#98b8b2", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="premium-surface border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 font-semibold mb-5 text-sm">
            <FileText size={16} className="text-[var(--primary)]" /> Por Modalidade
          </div>
          <div className="space-y-3">
            {Object.entries(stats.por_modalidade).map(([mod, c], i) => {
              const pct = total ? (c / total) * 100 : 0;
              return (
                <div key={mod}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white font-medium truncate pr-4">{mod}</span>
                    <span className="text-[var(--text-muted)] shrink-0">{c} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}99, ${COLORS[i % COLORS.length]})` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.por_modalidade).length === 0 && <div className="text-[var(--text-muted)] text-sm text-center py-6">Sem dados.</div>}
          </div>
        </div>
        <div className="premium-surface border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 font-semibold mb-5 text-sm">
            <Building2 size={16} className="text-[var(--primary)]" /> Top Empresas
          </div>
          <div className="space-y-3">
            {Object.entries(stats.por_empresa).map(([emp, c], i) => (
              <div key={emp}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white font-medium truncate pr-4" title={emp}>{emp}</span>
                  <span className="text-[var(--text-muted)] shrink-0">{c}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(c / maxEmp) * 100}%`, background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}99, ${COLORS[i % COLORS.length]})` }} />
                </div>
              </div>
            ))}
            {Object.keys(stats.por_empresa).length === 0 && <div className="text-[var(--text-muted)] text-sm text-center py-6">Sem dados.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
