"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  BarChart2, Calendar, RefreshCw, Download, TrendingUp, Users,
  CheckCircle2, Clock, XCircle, AlertCircle, Loader2, FileText, Building2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface ReportStats {
  total: number;
  por_status: Record<string, number>;
  por_modalidade: Record<string, number>;
  por_empresa: Record<string, number>;
  por_mes: Record<string, number>;
}

interface AtendimentoRelatorio {
  id: number;
  empresa: string;
  nome: string;
  modalidade: string;
  data: string;
  hora: string;
  status: string;
  has_laudo: boolean;
  has_avaliacao: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  "Concluído": "#22c55e", "Atendido": "#3b82f6",
  "Agendado": "#f59e0b", "Cancelado": "#ef4444",
  "Pendente": "#f97316", "Em andamento": "#a855f7",
};
const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

const Charts = dynamic(() => Promise.resolve(ChartsInner), { ssr: false });

export default function RelatoriosPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [atendimentos, setAtendimentos] = useState<AtendimentoRelatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [activeTab, setActiveTab] = useState<"visao" | "lista">("visao");

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    const API = process.env.NEXT_PUBLIC_API_URL || "/api";
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (dataInicio) p.set("data_inicio", dataInicio);
      if (dataFim) p.set("data_fim", dataFim);
      const qs = p.toString() ? `?${p}` : "";
      const hdrs = { Authorization: `Bearer ${token}` };
      const [sr, lr] = await Promise.all([
        fetch(`${API}/relatorios/stats${qs}`, { headers: hdrs }),
        fetch(`${API}/relatorios/atendimentos${qs}`, { headers: hdrs }),
      ]);
      if (sr.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      setStats(await sr.json());
      setAtendimentos(await lr.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [dataInicio, dataFim, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportCSV = () => {
    if (!atendimentos.length) return;
    const hdr = ["ID", "Empresa", "Paciente", "Modalidade", "Data", "Hora", "Status", "Laudo", "Avaliação"];
    const rows = atendimentos.map(a => [
      a.id, `"${a.empresa}"`, `"${a.nome}"`, `"${a.modalidade}"`,
      a.data, a.hora, a.status, a.has_laudo ? "Sim" : "Não", a.has_avaliacao ? "Sim" : "Não",
    ]);
    const csv = [hdr, ...rows].map(r => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `relatorio_${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const total = stats ? Object.values(stats.por_status).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <BarChart2 size={16} className="text-cyan-400" />
            </div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Relatórios</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Análise de Dados</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Visualização completa dos atendimentos</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)]"
        >
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="premium-surface rounded-2xl p-5 mb-6 border border-[var(--border)]">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4">
          <Calendar size={15} className="text-[var(--primary)]" /> Filtrar por Período
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          {[["Data Início", dataInicio, setDataInicio] as const, ["Data Fim", dataFim, setDataFim] as const].map(([lbl, val, setter]) => (
            <div key={lbl}>
              <label className="block text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider mb-1.5">{lbl}</label>
              <input
                type="date" value={val}
                onChange={e => setter(e.target.value)}
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>
          ))}
          <button
            onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 bg-[var(--card-hover)] border border-[var(--border)] hover:border-[var(--primary)]/40 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Aplicar
          </button>
          {(dataInicio || dataFim) && (
            <button onClick={() => { setDataInicio(""); setDataFim(""); }} className="text-[var(--text-muted)] hover:text-white text-xs underline">
              Limpar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
          <Loader2 size={32} className="animate-spin mr-3" /> Carregando relatórios...
        </div>
      ) : !stats ? (
        <div className="text-center text-[var(--text-muted)] py-20">Erro ao carregar dados.</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="premium-surface border border-[var(--border)] rounded-2xl p-5 hover:-translate-y-0.5 transition-transform">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">Total</span>
                <TrendingUp size={15} className="text-[var(--primary)]" />
              </div>
              <div className="text-3xl font-extrabold text-[var(--primary)]">{stats.total}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">atendimentos</div>
            </div>
            {Object.entries(stats.por_status).slice(0, 3).map(([s, c]) => (
              <div key={s} className="premium-surface border border-[var(--border)] rounded-2xl p-5 hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider truncate pr-2">{s}</span>
                  <span style={{ color: STATUS_COLORS[s] || "#22c55e" }}>
                    {s === "Concluído" ? <CheckCircle2 size={15} /> : s === "Cancelado" ? <XCircle size={15} /> : s === "Agendado" ? <Clock size={15} /> : <AlertCircle size={15} />}
                  </span>
                </div>
                <div className="text-3xl font-extrabold" style={{ color: STATUS_COLORS[s] || "#22c55e" }}>{c}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{total ? `${((c / total) * 100).toFixed(1)}%` : ""}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(["visao", "lista"] as const).map(t => (
              <button
                key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t ? "tab-active border border-[var(--border)]" : "bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white"}`}
              >
                {t === "visao" ? "📊 Visão Geral" : "📋 Lista de Dados"}
              </button>
            ))}
          </div>

          {activeTab === "visao" && <Charts stats={stats} total={total} />}

          {activeTab === "lista" && (
            <div className="premium-surface border border-[var(--border)] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
                <span className="font-semibold flex items-center gap-2 text-sm">
                  <FileText size={16} className="text-[var(--primary)]" /> {atendimentos.length} registros
                </span>
                <button onClick={exportCSV} className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
                  <Download size={12} /> CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider bg-[var(--card)]">
                      {["#", "Empresa", "Paciente", "Modalidade", "Data", "Status", "Docs"].map(h => (
                        <th key={h} className="p-4 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {atendimentos.length === 0 ? (
                      <tr><td colSpan={7} className="p-10 text-center text-[var(--text-muted)]">Nenhum registro encontrado.</td></tr>
                    ) : atendimentos.map((a, i) => (
                      <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors">
                        <td className="p-4 text-xs text-[var(--text-muted)]">{i + 1}</td>
                        <td className="p-4 text-sm font-semibold text-white max-w-[160px] truncate">{a.empresa}</td>
                        <td className="p-4 text-xs text-[var(--text-muted)]">{a.nome}</td>
                        <td className="p-4 text-sm text-white">{a.modalidade}</td>
                        <td className="p-4 text-sm text-[var(--text-muted)]">{a.data}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                            style={{ background: `${STATUS_COLORS[a.status] || "#22c55e"}18`, color: STATUS_COLORS[a.status] || "#22c55e", borderColor: `${STATUS_COLORS[a.status] || "#22c55e"}30` }}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1 text-[10px]">
                            {a.has_laudo && <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">L</span>}
                            {a.has_avaliacao && <span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">A</span>}
                            {!a.has_laudo && !a.has_avaliacao && <span className="text-[var(--text-muted)]">–</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChartsInner({ stats, total }: { stats: ReportStats; total: number }) {
  const mesData = Object.entries(stats.por_mes).map(([mes, c]) => {
    const [, m] = mes.split("-");
    return { name: `${m}/${mes.slice(2, 4)}`, value: c };
  });
  const statusData = Object.entries(stats.por_status).map(([name, value]) => ({ name, value }));
  const maxEmp = Math.max(...Object.values(stats.por_empresa), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart — por mês */}
        <div className="premium-surface border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 font-semibold mb-5 text-sm">
            <TrendingUp size={16} className="text-[var(--primary)]" /> Atendimentos por Mês
          </div>
          {mesData.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] py-10 text-sm">Nenhum dado no período.</div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mesData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="#3d5240" tick={{ fill: "#6b8870", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#3d5240" tick={{ fill: "#6b8870", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(8,15,9,0.95)", borderColor: "rgba(34,197,94,0.2)", borderRadius: "10px", color: "#fff" }}
                    itemStyle={{ color: "#4ade80" }}
                  />
                  <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} fillOpacity={0.85} name="Atendimentos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pie chart — por status */}
        <div className="premium-surface border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-2 font-semibold mb-5 text-sm">
            <Users size={16} className="text-[var(--primary)]" /> Distribuição por Status
          </div>
          {statusData.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] py-10 text-sm">Sem dados.</div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} fillOpacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(8,15,9,0.95)", borderColor: "rgba(34,197,94,0.2)", borderRadius: "10px", color: "#fff" }}
                  />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "#98b89e", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Modalidades + Empresas */}
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
