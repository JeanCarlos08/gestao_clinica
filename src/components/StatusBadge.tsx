const STATUS_STYLE: Record<string, { color: string }> = {
  Agendado: { color: "#F5B54A" },
  "Em andamento": { color: "#A78BFA" },
  Atendido: { color: "#60A5FA" },
  Concluído: { color: "#4DA768" },
  Cancelado: { color: "#F87171" },
  Ativo: { color: "#4DA768" },
  Inativo: { color: "#9CA3AF" },
};

export default function StatusBadge({ status, pulse }: { status: string; pulse?: boolean }) {
  const live = pulse ?? (status === "Agendado" || status === "Em andamento" || status === "Ativo");
  const color = STATUS_STYLE[status]?.color || "#98b8b2";
  return (
    <span
      className="badge-status inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 whitespace-nowrap"
      style={{ background: `${color}14`, color, borderColor: `${color}30` }}
    >
      <span className={`badge-dot w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 ${live ? "badge-pulse" : ""}`} style={{ background: color, ["--badge-c" as string]: color }} />
      {status}
    </span>
  );
}
