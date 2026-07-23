"use client";

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
}

export default function Pagination({ total, limit, offset, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (totalPages <= 1) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "12px 0" }}>
      <button
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(0, offset - limit))}
        style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #ccc", background: currentPage <= 1 ? "#f5f5f5" : "#fff", cursor: currentPage <= 1 ? "default" : "pointer" }}
      >
        Anterior
      </button>
      <span style={{ fontSize: 14, color: "#666" }}>
        Página {currentPage} de {totalPages} ({total} registros)
      </span>
      <button
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(offset + limit)}
        style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #ccc", background: currentPage >= totalPages ? "#f5f5f5" : "#fff", cursor: currentPage >= totalPages ? "default" : "pointer" }}
      >
        Próxima
      </button>
    </div>
  );
}
