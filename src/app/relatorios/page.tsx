"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  BarChart2, Calendar, RefreshCw, Download, TrendingUp, Users,
  CheckCircle2, Clock, XCircle, AlertCircle, Loader2, FileText, Building2,
} from "lucide-react";
import EmptyIllustration from "@/components/EmptyIllustration";
import { API as API_BASE } from "@/lib/api";

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
  "Concluído": "#10b981", "Atendido": "#3b82f6",
  "Agendado": "#f59e0b", "Confirmado": "#06b6d4",
  "Cancelado": "#ef4444", "Faltou": "#f97316",
  "Reagendado": "#6366f1", "Pendente": "#f97316", "Em andamento": "#a855f7",
};
const COLORS = ["#14b8a6", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

const Charts = dynamic(() => import("@/components/RelatoriosCharts"), {
  ssr: false,
  loading: () => <div className="h-64 w-full flex items-center justify-center"><div className="skeleton w-full h-full rounded-2xl" /></div>,
});

export default function RelatoriosPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [atendimentos, setAtendimentos] = useState<AtendimentoRelatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [activeTab, setActiveTab] = useState<"visao" | "lista">("visao");
  const [listaQ, setListaQ] = useState("");
  const [listaStatus, setListaStatus] = useState("todos");

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (dataInicio) p.set("data_inicio", dataInicio);
      if (dataFim) p.set("data_fim", dataFim);
      const qs = p.toString() ? `?${p}` : "";
      const hdrs = { Authorization: `Bearer ${token}` };
      const [sr, lr] = await Promise.all([
        fetch(`${API_BASE}/relatorios/stats${qs}`, { headers: hdrs }),
        fetch(`${API_BASE}/relatorios/atendimentos${qs}`, { headers: hdrs }),
      ]);
      if (sr.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      setStats(await sr.json());
      setAtendimentos(await lr.json());
    } catch (e) { console.debug("Erro ao carregar relatórios:", e); }
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
          className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_20px_rgba(20,184,166,0.3)]"
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
                  <span style={{ color: STATUS_COLORS[s] || "#14b8a6" }}>
                    {s === "Concluído" ? <CheckCircle2 size={15} /> : s === "Cancelado" ? <XCircle size={15} /> : s === "Agendado" ? <Clock size={15} /> : <AlertCircle size={15} />}
                  </span>
                </div>
                <div className="text-3xl font-extrabold" style={{ color: STATUS_COLORS[s] || "#14b8a6" }}>{c}</div>
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

          {activeTab === "lista" && (() => {
            const filtered = atendimentos.filter(a => {
              const matchesQ = !listaQ || a.nome.toLowerCase().includes(listaQ.toLowerCase()) || a.empresa.toLowerCase().includes(listaQ.toLowerCase()) || a.modalidade.toLowerCase().includes(listaQ.toLowerCase());
              const matchesStatus = listaStatus === "todos" || a.status === listaStatus;
              return matchesQ && matchesStatus;
            });
            const statusOpts = ["todos", ...Array.from(new Set(atendimentos.map(a=>a.status)))];
            return (
            <div className="space-y-4">
              {/* Filtros da lista - app style, não planilha */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 premium-surface rounded-xl p-3 flex items-center gap-3 border border-[var(--border)] focus-within:border-[var(--primary)]/30 transition-colors">
                  <FileText size={14} className="text-[var(--text-muted)] flex-shrink-0 ml-1" />
                  <input value={listaQ} onChange={e=>setListaQ(e.target.value)} placeholder="Buscar paciente, convênio ou abordagem..." className="w-full bg-transparent outline-none text-sm text-white placeholder:text-[var(--text-muted)]" />
                  {listaQ && <button onClick={()=>setListaQ("")} className="text-[var(--text-muted)] hover:text-white text-xs p-1">✕</button>}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  {statusOpts.map(s => (
                    <button key={s} onClick={()=>setListaStatus(s)} className={`px-3 py-2 rounded-full text-xs font-semibold border whitespace-nowrap transition-all ${listaStatus===s ? "bg-[var(--primary)] text-black border-[var(--primary)] shadow-md" : "bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-light)]"}`}>{s==="todos"?"Todos":s}</button>
                  ))}
                </div>
              </div>
              <div className="premium-surface border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]/50 backdrop-blur-sm">
                  <span className="font-semibold flex items-center gap-2 text-sm">
                    <FileText size={16} className="text-[var(--primary)]" /> {filtered.length} sessões <span className="text-[var(--text-muted)] font-normal hidden sm:inline">· {listaStatus==="todos"?"todas":"filtrado"} • app view</span>
                  </span>
                  <button onClick={exportCSV} className="inline-flex items-center gap-1.5 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                    <Download size={12} /> Exportar CSV
                  </button>
                </div>
                {filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <EmptyIllustration variant="report" size={80} />
                    <p className="text-sm text-[var(--text-muted)] mt-3">Nenhum registro para este filtro.</p>
                    <button onClick={()=>{setListaQ(""); setListaStatus("todos");}} className="text-xs text-[var(--primary)] underline mt-2">Limpar filtros</button>
                  </div>
                ) : (
                  <div className="p-3 space-y-3 max-h-[65vh] overflow-y-auto scrollbar-thin bg-[var(--background)]/30">
                    {filtered.map((a) => {
                      const initials = a.nome.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join("");
                      const color = STATUS_COLORS[a.status] || "#14b8a6";
                      return (
                        <div key={a.id} className="group bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)]/20 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--card)] border border-[var(--border)] group-hover:border-[var(--primary)]/30 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{initials}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-white truncate group-hover:text-[var(--primary)] transition-colors">{a.nome}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0" style={{ background: `${color}14`, color, borderColor: `${color}30` }}><span className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0" style={{ background: color }} />{a.status}</span>
                              {a.has_laudo && <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">Laudo</span>}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1"><Calendar size={11} />{a.data}</span><span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" /><span className="inline-flex items-center gap-1"><Clock size={11} />{a.hora}</span><span className="w-1 h-1 rounded-full bg-[var(--text-muted)] hidden sm:inline" /><span className="hidden sm:inline-flex items-center gap-1"><Building2 size={11} />{a.empresa || "Particular"}</span><span className="hidden sm:inline w-1 h-1 rounded-full bg-[var(--text-muted)]" /><span className="bg-white/5 border border-white/5 rounded-full px-2 py-0.5 text-[11px]">{a.modalidade}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
