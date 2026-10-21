"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Building2, Trophy } from "lucide-react";
import { mergeEmpresas } from "@/lib/empresa";

const PALETTE = [
  "#B7E8BF", "#8DDB98", "#58B86A", "#4DA768", "#379451",
  "#24753D", "#164B2A", "#0F3D24", "#7BCF8A", "#2f9e55",
];

const MEDALS = ["🥇", "🥈", "🥉"];

interface EmpresaRankingProps {
  entries: Array<[string, number]>;
  total: number;
}

export default function EmpresaRanking({ entries, total }: EmpresaRankingProps) {
  const sorted = mergeEmpresas(entries).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")
  );
  const top10 = sorted.slice(0, 10);
  const restantes = sorted.slice(10);
  const outras = restantes.reduce((s, [, v]) => s + v, 0);
  const pieData = [
    ...top10.map(([name, value]) => ({ name, value })),
    ...(outras > 0 ? [{ name: "Outras", value: outras }] : []),
  ];
  const top8 = sorted.slice(0, 8);
  const max = top8[0]?.[1] || 1;

  const tooltipStyle = {
    backgroundColor: "rgba(8,15,9,0.95)",
    borderColor: "rgba(77,167,104,0.2)",
    borderRadius: "10px",
    color: "#fff",
    boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
  } as const;

  return (
    <>
      {/* ── Pizza: atendimentos por empresa ─────────────────── */}
      <div className="premium-surface rounded-2xl p-6 relative overflow-hidden group fade-up-delay-2 flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <div className="flex items-center justify-between mb-5 relative z-10">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 size={16} className="text-[var(--primary)]" />
            Atendimentos por Empresa
          </h3>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--primary-dim)] text-[var(--primary-bright)] border border-[rgba(77,167,104,0.2)] whitespace-nowrap">
            {new Intl.NumberFormat("pt-BR").format(total)}
          </span>
        </div>

        {pieData.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center mb-3">
              <Building2 size={24} className="text-[var(--primary)]" />
            </div>
            <p className="text-sm text-[var(--text-label)] font-semibold">Nenhuma empresa ainda</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Os atendimentos com convênio aparecem aqui.</p>
          </div>
        ) : (
          <div className="relative flex-1 min-h-[260px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="86%"
                  paddingAngle={2}
                  stroke="rgba(2,16,11,0.85)"
                  strokeWidth={2}
                  isAnimationActive
                  animationDuration={900}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={PALETTE[i % PALETTE.length]}
                      fillOpacity={0.95}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#7BCF8A" }} cursor={false} />
              </PieChart>
            </ResponsiveContainer>

            {/* Total ao centro do donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-muted)] font-bold">Total</span>
              <span className="text-2xl font-extrabold text-white leading-none mt-1">
                {new Intl.NumberFormat("pt-BR").format(total)}
              </span>
              <span className="text-[10px] text-[var(--text-label)] mt-1">atendimentos</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Ranking pódio top 8 ─────────────────────────────── */}
      <div className="lg:col-span-2 premium-surface rounded-2xl p-6 relative overflow-hidden group fade-up-delay-3">
        {/* linha de brilho no topo */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[rgba(168,232,183,0.45)] to-transparent opacity-70" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" />
            Ranking de Empresas
          </h3>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/[0.06] text-[var(--text-label)] border border-[var(--border)]">
            Top {top8.length}
          </span>
        </div>

        {top8.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
              <Trophy size={24} className="text-amber-400" />
            </div>
            <p className="text-sm text-[var(--text-label)] font-semibold">Sem dados para o ranking</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Assim que houver atendimentos, o pódio aparece.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {top8.map(([empresa, qtd], i) => {
              const pct = total > 0 ? (qtd / total) * 100 : 0;
              const barW = Math.max(6, Math.round((qtd / max) * 100));
              const medal = MEDALS[i];
              const pos = i + 1;
              const posCls =
                pos === 1
                  ? "bg-[linear-gradient(135deg,#8ee39a,#2f9e55)] text-[#052417] shadow-[0_0_14px_rgba(142,227,154,0.55)]"
                  : pos === 2
                  ? "bg-[linear-gradient(135deg,#e9e6ff,#c4b5fd)] text-[#1e1b3a] shadow-[0_0_10px_rgba(196,181,253,0.35)]"
                  : pos === 3
                  ? "bg-[linear-gradient(135deg,#fde68a,#f59e0b)] text-[#3b2705] shadow-[0_0_10px_rgba(245,158,11,0.35)]"
                  : "bg-white/[0.06] text-[var(--text-label)] border border-[var(--border)]";
              const rowCls =
                pos === 1
                  ? "border-[rgba(168,235,177,0.5)] bg-[linear-gradient(135deg,rgba(142,227,154,0.2),rgba(255,255,255,0.05))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_22px_rgba(0,0,0,0.22)]"
                  : pos === 2
                  ? "border-[rgba(196,181,253,0.32)] bg-[linear-gradient(135deg,rgba(196,181,253,0.12),rgba(255,255,255,0.03))]"
                  : pos === 3
                  ? "border-[rgba(245,158,11,0.32)] bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(255,255,255,0.03))]"
                  : "border-[var(--border)] hover:bg-white/[0.04]";

              return (
                <div
                  key={empresa}
                  className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 min-h-[52px] px-3 py-2.5 rounded-2xl border transition-all duration-200 hover:translate-x-[3px] ${rowCls}`}
                  style={{ animation: `fadeUp 450ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both` }}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black ${posCls}`}>
                    {medal || pos}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className={`text-sm font-semibold truncate ${pos === 1 ? "text-white" : "text-[var(--text-secondary)]"}`} title={empresa}>
                        {empresa}
                      </span>
                      <span className={`text-xs font-bold shrink-0 ${pos === 1 ? "text-[#a8e8b7]" : "text-[var(--text-muted)]"}`}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="progress-bar h-1.5">
                      <div
                        className="progress-fill"
                        style={{ width: `${barW}%`, transitionDelay: `${i * 70}ms` }}
                      />
                    </div>
                  </div>

                  <div className="text-right min-w-[54px]">
                    <div className="text-sm font-extrabold text-white leading-none">{qtd}</div>
                    <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">atend.</div>
                  </div>
                </div>
              );
            })}
            {sorted.length > 8 && (
              <p className="text-[11px] text-[var(--text-muted)] text-center pt-1">
                +{sorted.length - 8} empresa(s) · {new Intl.NumberFormat("pt-BR").format(total)} atendimentos no total
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
