"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2, Calendar, RefreshCw, Download, TrendingUp, Users,
  CheckCircle2, Clock, XCircle, AlertCircle, Loader2, FileText, Building2
} from "lucide-react";

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
  "Agendado": "#f59e0b", "Cancelado": "#ef4444", "Pendente": "#f97316",
  "Em andamento": "#a855f7",
};
const STATUS_BG: Record<string, string> = {
  "Concluído": "rgba(34,197,94,0.12)", "Atendido": "rgba(59,130,246,0.12)",
  "Agendado": "rgba(245,158,11,0.12)", "Cancelado": "rgba(239,68,68,0.12)", "Pendente": "rgba(249,115,22,0.12)",
  "Em andamento": "rgba(168,85,247,0.12)",
};
const COLORS = ["#22c55e","#3b82f6","#a855f7","#f59e0b","#ef4444","#06b6d4","#ec4899"];

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
    const hdr = ["ID","Empresa","Paciente","Modalidade","Data","Hora","Status","Laudo","Avaliação"];
    const rows = atendimentos.map(a => [
      a.id, `"${a.empresa}"`, `"${a.nome}"`, `"${a.modalidade}"`,
      a.data, a.hora, a.status, a.has_laudo?"Sim":"Não", a.has_avaliacao?"Sim":"Não"
    ]);
    const csv = [hdr,...rows].map(r=>r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8"}));
    Object.assign(document.createElement("a"), { href:url, download:`relatorio_${new Date().toISOString().slice(0,10)}.csv`}).click();
    URL.revokeObjectURL(url);
  };

  const total = stats ? Object.values(stats.por_status).reduce((a,b)=>a+b,0) : 0;
  const maxMes = stats ? Math.max(...Object.values(stats.por_mes),1) : 1;
  const maxEmp = stats ? Math.max(...Object.values(stats.por_empresa),1) : 1;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-[var(--primary)]/10 text-[var(--primary)] p-2 rounded-lg"><BarChart2 size={24}/></div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
          </div>
          <p className="text-[var(--text-muted)] text-sm">Análise completa dos atendimentos</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          <Download size={16}/> Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4">
          <Calendar size={16} className="text-[var(--primary)]"/> Filtrar por Período
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          {[["Data Início", dataInicio, setDataInicio], ["Data Fim", dataFim, setDataFim]].map(([lbl, val, setter]) => (
            <div key={lbl as string}>
              <label className="block text-[11px] text-[var(--text-label)] font-medium mb-1.5">{lbl as string}</label>
              <input type="date" value={val as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)}
                className="bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[var(--primary)]"/>
            </div>
          ))}
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 bg-[var(--card-hover)] border border-[var(--border)] hover:border-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading?"animate-spin":""}/> Aplicar
          </button>
          {(dataInicio||dataFim)&&<button onClick={()=>{setDataInicio("");setDataFim("");}} className="text-[var(--text-muted)] hover:text-white text-xs underline">Limpar</button>}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
          <Loader2 size={32} className="animate-spin mr-3"/> Carregando relatórios...
        </div>
      ) : !stats ? (
        <div className="text-center text-[var(--text-muted)] py-20">Erro ao carregar dados.</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">Total</span>
                <TrendingUp size={16} className="text-[var(--primary)]"/>
              </div>
              <div className="text-3xl font-bold text-[var(--primary)]">{stats.total}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">atendimentos</div>
            </div>
            {Object.entries(stats.por_status).slice(0,3).map(([s,c])=>(
              <div key={s} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">{s}</span>
                  <span style={{color:STATUS_COLORS[s]||"#22c55e"}}>
                    {s==="Concluído"?<CheckCircle2 size={16}/>:s==="Cancelado"?<XCircle size={16}/>:s==="Agendado"?<Clock size={16}/>:<AlertCircle size={16}/>}
                  </span>
                </div>
                <div className="text-3xl font-bold" style={{color:STATUS_COLORS[s]||"#22c55e"}}>{c}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{total?`${((c/total)*100).toFixed(1)}% do total`:""}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(["visao","lista"] as const).map(t=>(
              <button key={t} onClick={()=>setActiveTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab===t?"bg-[var(--primary)] text-black":"bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white"}`}>
                {t==="visao"?"📊 Visão Geral":"📋 Lista de Dados"}
              </button>
            ))}
          </div>

          {activeTab==="visao" && (
            <div className="space-y-6">
              {/* Barras por Mês */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                <div className="flex items-center gap-2 font-semibold mb-6"><TrendingUp size={18} className="text-[var(--primary)]"/> Atendimentos por Mês</div>
                {Object.keys(stats.por_mes).length===0?(
                  <div className="text-center text-[var(--text-muted)] py-10 text-sm">Nenhum dado no período.</div>
                ):(
                  <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
                    {Object.entries(stats.por_mes).map(([mes,c])=>{
                      const pct=(c/maxMes)*100;
                      const [ano,m]=mes.split("-");
                      return (
                        <div key={mes} className="flex flex-col items-center gap-1 min-w-[48px] group">
                          <div className="text-[10px] text-[var(--primary)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">{c}</div>
                          <div className="w-10 rounded-t-md bg-[var(--primary)]/70 hover:bg-[var(--primary)] transition-all" style={{height:`${Math.max(pct,4)}%`}} title={`${mes}: ${c}`}/>
                          <div className="text-[9px] text-[var(--text-muted)]">{m}/{ano.slice(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Modalidade */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                  <div className="flex items-center gap-2 font-semibold mb-5"><FileText size={18} className="text-[var(--primary)]"/> Por Modalidade</div>
                  <div className="space-y-3">
                    {Object.entries(stats.por_modalidade).map(([mod,c],i)=>{
                      const pct=total?(c/total)*100:0;
                      return (
                        <div key={mod}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-white font-medium truncate">{mod}</span>
                            <span className="text-[var(--text-muted)] ml-2 shrink-0">{c} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${pct}%`,background:COLORS[i%COLORS.length]}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Empresas */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                  <div className="flex items-center gap-2 font-semibold mb-5"><Building2 size={18} className="text-[var(--primary)]"/> Top Empresas</div>
                  <div className="space-y-3">
                    {Object.entries(stats.por_empresa).map(([emp,c],i)=>(
                      <div key={emp}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white font-medium truncate" title={emp}>{emp}</span>
                          <span className="text-[var(--text-muted)] ml-2 shrink-0">{c}</span>
                        </div>
                        <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${(c/maxEmp)*100}%`,background:COLORS[i%COLORS.length]}}/>
                        </div>
                      </div>
                    ))}
                    {Object.keys(stats.por_empresa).length===0&&<div className="text-[var(--text-muted)] text-sm text-center py-8">Sem dados.</div>}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                <div className="flex items-center gap-2 font-semibold mb-5"><Users size={18} className="text-[var(--primary)]"/> Distribuição por Status</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.por_status).map(([s,c])=>(
                    <div key={s} className="rounded-xl p-4 text-center" style={{background:STATUS_BG[s]||"rgba(34,197,94,0.1)"}}>
                      <div className="text-2xl font-bold mb-1" style={{color:STATUS_COLORS[s]||"#22c55e"}}>{c}</div>
                      <div className="text-xs font-semibold" style={{color:STATUS_COLORS[s]||"#22c55e"}}>{s}</div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-1">{total?((c/total)*100).toFixed(1):0}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab==="lista" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
                <span className="font-semibold flex items-center gap-2"><FileText size={16} className="text-[var(--primary)]"/>{atendimentos.length} registros</span>
                <button onClick={exportCSV} className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"><Download size={12}/>Exportar CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider">
                    {["#","Empresa","Paciente","Modalidade","Data","Status","Docs"].map(h=><th key={h} className="p-4 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {atendimentos.length===0?(
                      <tr><td colSpan={7} className="p-10 text-center text-[var(--text-muted)]">Nenhum registro encontrado.</td></tr>
                    ):atendimentos.map((a,i)=>(
                      <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors">
                        <td className="p-4 text-xs text-[var(--text-muted)]">{i+1}</td>
                        <td className="p-4 text-sm font-semibold text-white max-w-[180px] truncate">{a.empresa}</td>
                        <td className="p-4 text-xs text-[var(--text-muted)]">{a.nome}</td>
                        <td className="p-4 text-sm text-white">{a.modalidade}</td>
                        <td className="p-4 text-sm text-[var(--text-muted)]">{a.data}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" style={{background:STATUS_BG[a.status]||"rgba(34,197,94,0.12)",color:STATUS_COLORS[a.status]||"#22c55e"}}>{a.status}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1 text-[10px]">
                            {a.has_laudo&&<span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">L</span>}
                            {a.has_avaliacao&&<span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">A</span>}
                            {!a.has_laudo&&!a.has_avaliacao&&<span className="text-[var(--text-muted)]">–</span>}
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
