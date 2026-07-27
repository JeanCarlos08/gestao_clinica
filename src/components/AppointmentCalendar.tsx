"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

export interface CalendarAppointment {
  id: number;
  nome: string;
  empresa: string;
  modalidade: string;
  status: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Concluído": { bg: "rgba(20,184,166,0.2)", border: "#14b8a6", text: "#86efac" },
  "Atendido": { bg: "rgba(59,130,246,0.2)", border: "#3b82f6", text: "#93c5fd" },
  "Agendado": { bg: "rgba(245,158,11,0.2)", border: "#f59e0b", text: "#fcd34d" },
  "Em andamento": { bg: "rgba(245,158,11,0.2)", border: "#f59e0b", text: "#fcd34d" },
  "Cancelado": { bg: "rgba(239,68,68,0.2)", border: "#ef4444", text: "#fca5a5" },
  "Pendente": { bg: "rgba(249,115,22,0.2)", border: "#f97316", text: "#fdba74" },
};

const DEFAULT_COLOR = { bg: "rgba(107,124,107,0.2)", border: "#6b7c6b", text: "#9ca89c" };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function statusStyle(status: string) {
  return STATUS_COLORS[status] || DEFAULT_COLOR;
}

interface Props {
  appointments: CalendarAppointment[];
  onSelect?: (a: CalendarAppointment) => void;
}

export default function AppointmentCalendar({ appointments, onSelect }: Props) {
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(() => new Date());

  const byDate = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    for (const a of appointments) {
      if (!a.data) continue;
      if (!map[a.data]) map[a.data] = [];
      map[a.data].push(a);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((x, y) => (x.hora || "").localeCompare(y.hora || ""));
    }
    return map;
  }, [appointments]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const monthGrid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const start = startOfWeek(first);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
    return cells;
  }, [cursor]);

  const navigate = (delta: number) => {
    const next = new Date(cursor);
    if (view === "week") next.setDate(next.getDate() + delta * 7);
    else next.setMonth(next.getMonth() + delta);
    setCursor(next);
  };

  const goToday = () => setCursor(new Date());

  const headerLabel =
    view === "week"
      ? `${weekDays[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${weekDays[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
      : `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  const renderBlock = (a: CalendarAppointment, compact = false) => {
    const s = statusStyle(a.status);
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => onSelect?.(a)}
        className={`w-full text-left rounded-md border-l-[3px] px-2 py-1 transition-opacity hover:opacity-90 ${compact ? "text-[10px]" : "text-xs"}`}
        style={{ backgroundColor: s.bg, borderLeftColor: s.border, color: s.text }}
        title={`${a.nome} — ${a.status}`}
      >
        <div className="font-semibold truncate">{a.hora} {a.nome}</div>
        {!compact && <div className="truncate opacity-80">{a.empresa}</div>}
      </button>
    );
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <CalendarIcon size={18} className="text-[var(--primary)]" />
          Calendário de Atendimentos
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v ? "bg-[var(--primary)] text-black" : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                {v === "week" ? "Semanal" : "Mensal"}
              </button>
            ))}
          </div>
          <button type="button" onClick={goToday} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-white">
            Hoje
          </button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-white">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-white min-w-[140px] text-center">{headerLabel}</span>
            <button type="button" onClick={() => navigate(1)} className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-white">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex flex-wrap gap-3 text-[10px]">
        {Object.entries(STATUS_COLORS).filter(([k]) => k !== "Em andamento").map(([label, s]) => (
          <span key={label} className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.border }} />
            {label}
          </span>
        ))}
      </div>

      {view === "week" ? (
        <div className="overflow-x-auto">
          <div className="min-w-[640px] grid grid-cols-7 divide-x divide-[var(--border)]">
            {weekDays.map((day) => {
              const iso = toIso(day);
              const items = byDate[iso] || [];
              const isToday = toIso(new Date()) === iso;
              return (
                <div key={iso} className="min-h-[280px] flex flex-col">
                  <div className={`p-2 text-center border-b border-[var(--border)] ${isToday ? "bg-[var(--primary)]/10" : "bg-[var(--background)]/50"}`}>
                    <div className="text-[10px] uppercase text-[var(--text-label)]">{WEEKDAYS[day.getDay()]}</div>
                    <div className={`text-lg font-bold ${isToday ? "text-[var(--primary)]" : "text-white"}`}>{day.getDate()}</div>
                  </div>
                  <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto max-h-[320px]">
                    {items.length === 0 ? (
                      <p className="text-[10px] text-[var(--text-muted)] text-center pt-4">—</p>
                    ) : (
                      items.map((a) => renderBlock(a))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-2 sm:p-4 overflow-x-auto">
          <div className="min-w-[320px]">
            <div className="grid grid-cols-7 gap-px mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[10px] uppercase text-[var(--text-label)] py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((day) => {
                const iso = toIso(day);
                const items = byDate[iso] || [];
                const inMonth = day.getMonth() === cursor.getMonth();
                const isToday = toIso(new Date()) === iso;
                return (
                  <div
                    key={iso + day.getTime()}
                    className={`min-h-[72px] sm:min-h-[88px] rounded-lg border p-1 ${
                      inMonth ? "border-[var(--border)] bg-[var(--background)]/30" : "border-transparent bg-transparent opacity-40"
                    } ${isToday ? "ring-1 ring-[var(--primary)]" : ""}`}
                  >
                    <div className={`text-[11px] font-semibold mb-0.5 ${isToday ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {items.slice(0, 2).map((a) => renderBlock(a, true))}
                      {items.length > 2 && (
                        <div className="text-[9px] text-[var(--text-muted)] pl-1">+{items.length - 2} mais</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
