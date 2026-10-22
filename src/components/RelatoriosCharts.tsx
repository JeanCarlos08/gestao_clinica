"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Label } from "recharts";
import EmptyIllustration from "@/components/EmptyIllustration";
import EmpresaRanking from "@/components/EmpresaRanking";
import { TrendingUp, Users, FileText } from "lucide-react";

interface ReportStats {
  total: number;
  por_status: Record<string, number>;
  por_modalidade: Record<string, number>;
  por_empresa: Record<string, number>;
  por_mes: Record<string, number>;
}

/* Status = cores semânticas (leitura clínica); demais gráficos = rampa verde clínico */
const STATUS_COLORS: Record<string, string> = {
  "Concluído": "#4DA768", "Atendido": "#3b82f6",
  "Agendado": "#f59e0b", "Cancelado": "#ef4444",
  "Pendente": "#f97316", "Em andamento": "#a855f7",
};
const GREENS = ["#4DA768", "#7BCF8A", "#2f9e55", "#8DDB98", "#1E7A46", "#58B86A", "#166b3a", "#B7E8BF"];

const tooltipStyle = {
  backgroundColor: "rgba(8,15,9,0.95)",
  borderColor: "rgba(77,167,104,0.2)",
  borderRadius: "10px",
  color: "#fff",
  boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
} as const;

function EmptyBox({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-in text-center py-10">
      <div className="empty-float flex justify-center"><EmptyIllustration variant="report" size={80} /></div>
      <p className="text-[var(--text-muted)] text-sm mt-3">{title}</p>
      {hint && <p className="text-[var(--text-muted)] text-xs mt-1 opacity-70">{hint}</p>}
    </div>
  );
}

export default function RelatoriosCharts({ stats, total }: { stats: ReportStats; total: number }) {
  const mesData = Object.entries(stats.por_mes).map(([mes, c]) => {
    const [, m] = mes.split("-");
    return { name: `${m}/${mes.slice(2, 4)}`, value: c };
  });
  const statusData = Object.entries(stats.por_status).map(([name, value]) => ({ name, value }));
  const modalidadeData = Object.entries(stats.por_modalidade).sort((a, b) => b[1] - a[1]);
  const maxModal = Math.max(...modalidadeData.map(([, c]) => c), 1);
  const empresaEntries = Object.entries(stats.por_empresa) as Array<[string, number]>;
  const totalEmpresa = empresaEntries.reduce((s, [, v]) => s + (Number(v) || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Linha 1: mês · status · modalidade ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="premium-surface border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 font-semibold mb-5 text-sm">
            <TrendingUp size={16} className="text-[var(--primary)]" /> Atendimentos por Mês
          </div>
          {mesData.length === 0 ? (
            <EmptyBox title="Nenhum dado no período." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mesData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="barMesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7BCF8A" />
                      <stop offset="100%" stopColor="#1E7A46" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="#3d5554" tick={{ fill: "#6b8e8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#3d5554" tick={{ fill: "#6b8e8a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#7BCF8A" }} cursor={{ fill: "rgba(77,167,104,0.06)" }} />
                  <Bar dataKey="value" fill="url(#barMesGrad)" radius={[6, 6, 0, 0]} fillOpacity={0.92} name="Atendimentos" />
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
            <EmptyBox title="Sem dados." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={3} dataKey="value" stroke="rgba(2,16,11,0.85)">
                    {statusData.map((entry, i) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || GREENS[i % GREENS.length]} fillOpacity={0.9} />
                    ))}
                    <Label
                      content={(props) => {
                        const vb = props.viewBox as { cx?: number; cy?: number } | undefined;
                        return vb && vb.cx != null && vb.cy != null ? (
                          <text x={vb.cx} y={vb.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={vb.cx} dy="-0.35em" style={{ fill: "#fff", fontSize: 20, fontWeight: 800 }}>
                              {total}
                            </tspan>
                            <tspan x={vb.cx} dy="1.25em" style={{ fill: "#6b8e8a", fontSize: 9, fontWeight: 600 }}>
                              sessões
                            </tspan>
                          </text>
                        ) : null;
                      }}
                    />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "#98b8b2", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="premium-surface border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 font-semibold mb-5 text-sm">
            <FileText size={16} className="text-[var(--primary)]" /> Por Modalidade
          </div>
          {modalidadeData.length === 0 ? (
            <EmptyBox title="Sem dados." />
          ) : (
            <div className="space-y-3">
              {modalidadeData.map(([mod, c], i) => {
                const pct = total ? (c / total) * 100 : 0;
                const color = GREENS[i % GREENS.length];
                return (
                  <div key={mod}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white font-medium truncate pr-4">{mod}</span>
                      <span className="text-[var(--text-muted)] shrink-0">{c} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(c / maxModal) * 100}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Linha 2: pizza + ranking pódio por empresa ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <EmpresaRanking entries={empresaEntries} total={totalEmpresa} />
      </div>
    </div>
  );
}
