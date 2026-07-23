"use client";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Agendado: { bg: "#fff3cd", text: "#856404" },
  Atendido: { bg: "rgba(20,184,166,0.15)", text: "#14b8a6" },
  Concluído: { bg: "rgba(20,184,166,0.15)", text: "#14b8a6" },
  Cancelado: { bg: "#f8d7da", text: "#842029" },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || { bg: "#e2e3e5", text: "#41464b" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: colors.bg,
        color: colors.text,
      }}
    >
      {status}
    </span>
  );
}
