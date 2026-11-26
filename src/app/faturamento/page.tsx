"use client";

import { useState } from "react";
import useSWR from "swr";
import { Calendar, ChevronLeft, ChevronRight, Download, Printer, Clock, Activity } from "lucide-react";
import { swrFetcher, API as API_BASE } from "@/lib/api";

interface DiaFaturamento {
  dia: number;
  data: string;
  atendimentos: Array<{
    id: number; nome: string; modalidade: string; data: string; hora: string;
    status: string; empresa: string | null; paciente_id: number | null; foto: string | null;
  }>;
  totalAtendimentos: number;
  faturamento: number;
}

interface FaturamentoData {
  ano: number;
  mes: number;
  ultimoDiaMes: number;
  diaHoje: number | null;
  totalAtendimentos: number;
  totalFaturamento: number;
  diasDoMes: DiaFaturamento[];
  nomeMes: string;
}

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function FaturamentoPage() {
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);

  const { data, isLoading } = useSWR<FaturamentoData>(
    `${API_BASE}/faturamento?ano=${ano}&mes=${mes}`,
    swrFetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const payload = data;
  const carregando = isLoading && !data;

  const totalAtendimentos = payload?.totalAtendimentos ?? 0;
  const totalFaturamento = payload?.totalFaturamento ?? 0;
  const diasDoMes = payload?.diasDoMes ?? [];
  const nomeMes = payload?.nomeMes ?? "";
  const anoAtual = payload?.ano ?? ano;
  const mesAtual = payload?.mes ?? mes;
  const diaHoje = payload?.diaHoje ?? null;

  const primeiroDiaSemana = new Date(anoAtual, mesAtual - 1, 1).getDay();

  const mudarMes = (delta: number) => {
    let novoMes = mesAtual + delta;
    let novoAno = anoAtual;
    if (novoMes > 12) { novoMes = 1; novoAno++; }
    if (novoMes < 1) { novoMes = 12; novoAno--; }
    setAno(novoAno);
    setMes(novoMes);
  };

  const statusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "finalizado" || s === "concluído" || s === "atendido") return "text-emerald-400";
    if (s === "cancelado" || s === "faltou") return "text-red-400";
    if (s === "reagendado") return "text-blue-400";
    return "text-[var(--text-muted)]";
  };

  if (carregando) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
            <Calendar size={24} className="text-[var(--primary)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Carregando faturamento…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-hide fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Calendar size={16} className="text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Faturamento</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Faturamento Mensal</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Valor por atendimento: <span className="text-emerald-400 font-bold">R$ 50,00</span>
          </p>
        </div>
        <div className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-2">
          <button onClick={() => mudarMes(-1)} disabled={carregando}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/[0.05] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center min-w-[120px]">
            <div className="text-xs font-bold text-[var(--text-label)] uppercase tracking-wider mb-1">{MESES_PT[mesAtual - 1]}</div>
            <div className="text-xl font-extrabold text-white">{anoAtual}</div>
          </div>
          <button onClick={() => mudarMes(1)} disabled={carregando}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/[0.05] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-violet-400 border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-all">
            <Printer size={13} /> Imprimir
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-all">
            <Download size={13} /> Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 mb-8">
        <div className="premium-surface rounded-2xl p-5 border border-emerald-500/15">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Total Atendimentos</span>
            <Activity size={16} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalAtendimentos}</div>
        </div>
        <div className="premium-surface rounded-2xl p-5 border border-[var(--primary)]/15">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-wider">Faturamento</span>
            <Clock size={16} className="text-[var(--primary)]" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            R$ {totalFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="premium-surface rounded-2xl p-5 border border-blue-500/15">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Dias com Atendimento</span>
            <Calendar size={16} className="text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {diasDoMes.filter(d => d.totalAtendimentos > 0).length} / {diasDoMes.length}
          </div>
        </div>
        <div className="premium-surface rounded-2xl p-5 border border-amber-500/15">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Média por Dia</span>
            <Activity size={16} className="text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {diasDoMes.length > 0 ? (totalAtendimentos / diasDoMes.length).toFixed(1) : "0"}
          </div>
        </div>
      </div>

      <div className="premium-surface rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] bg-[var(--card)]/50">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar size={14} className="text-emerald-400" />
            {nomeMes} de {anoAtual}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Dias com atendimento concluído aparecem com destaque. Valor: R$ 50,00 por atendimento.
          </p>
        </div>

        <div className="grid grid-cols-7 gap-1 p-4 border-b border-[var(--border)] bg-white/[0.02]">
          {DIAS_SEMANA.map(dia => (
            <div key={dia} className="text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{dia}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 p-3">
          {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
            <div key={`vazio-${i}`} className="h-12" />
          ))}
          {diasDoMes.map(dia => {
            const temAtendimento = dia.totalAtendimentos > 0;
            const ehHoje = diaHoje !== null && dia.dia === diaHoje;
            const faturamentoDia = dia.faturamento;
            return (
              <div key={dia.data} className="flex flex-col h-20 min-h-[80px]">
                <div className={`flex items-center justify-between px-2 py-1.5 rounded-xl cursor-pointer transition-all ${temAtendimento ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-white/[0.02] border border-transparent hover:bg-white/[0.05]"} ${ehHoje ? "ring-2 ring-emerald-400" : ""}`}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={`text-xs font-bold ${temAtendimento ? "text-emerald-400" : ehHoje ? "text-white" : "text-[var(--text-muted)]"}`}>{dia.dia}</span>
                    {temAtendimento && (
                      <>
                        <span className="text-[9px] font-bold text-emerald-400">{dia.totalAtendimentos}</span>
                        <span className="text-[8px] text-emerald-300">R$ {faturamentoDia.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {dia.atendimentos.slice(0, 3).map(a => (
                      <div key={a.id} className="w-2 h-2 rounded-full bg-emerald-400" />
                    ))}
                    {dia.atendimentos.length > 3 && <div className="w-2 h-2 rounded-full bg-emerald-200" />}
                  </div>
                </div>
                {temAtendimento && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-[var(--card)]/90 border-t border-[var(--border)]">
                    <div className="space-y-1.5">
                      {dia.atendimentos.map(a => (
                        <div key={a.id} className="flex items-center justify-between gap-2 px-1">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-white truncate">{a.nome}</span>
                            <span className="text-[8px] text-[var(--text-muted)]">{a.modalidade}</span>
                          </div>
                          <span className={`text-[9px] font-bold ${statusColor(a.status)}`}>{a.status || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[var(--border)] bg-[var(--card)]/30">
          <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Atendido / Concluído</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500/10 border border-red-500/20" />
              <span>Cancelado / Faltou</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500/10 border border-blue-500/20" />
              <span>Reagendado</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="w-2 h-2 rounded-full ring-2 ring-emerald-400" />
              <span>Hoje</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 premium-surface rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] bg-[var(--card)]/50">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={14} className="text-[var(--primary)]" />
            Detalhe — {nomeMes} de {anoAtual}
          </h3>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {diasDoMes.filter(d => d.totalAtendimentos > 0).map(dia => (
            <div key={dia.data} className="p-4 hover:bg-[var(--card-hover)] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{dia.data}</span>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                    {dia.totalAtendimentos} atendimento{dia.totalAtendimentos > 1 ? "s" : ""}
                  </span>
                  <span className="text-[9px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-full px-2 py-0.5">
                    R$ {dia.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                {dia.atendimentos.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-2 px-1 py-1 rounded-lg hover:bg-white/[0.02] cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{a.nome}</span>
                        <span className={`text-[9px] font-bold ${statusColor(a.status)}`}>{a.status || "Agendado"}</span>
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                        <span>{a.modalidade}</span>
                        {a.empresa && <span className="text-[var(--text-muted)]">· {a.empresa}</span>}
                        <span>{a.hora}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">R$ 50,00</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {diasDoMes.filter(d => d.totalAtendimentos > 0).length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mx-auto mb-3">
                <Calendar size={32} className="text-[var(--text-muted)] opacity-50" />
              </div>
              <p className="text-sm text-[var(--text-muted)]">Nenhum atendimento neste mês.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
