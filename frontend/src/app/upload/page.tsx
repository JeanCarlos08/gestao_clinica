"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Upload, FileText, Trash2, AlertCircle, CheckCircle2,
  Loader2, RefreshCw, HardDrive, Clock, File, ChevronRight
} from "lucide-react";
import EmptyIllustration from "@/components/EmptyIllustration";

interface Arquivo {
  id: number;
  filename: string;
  content_type: string;
  size: number;
  size_kb: number;
  criado_em: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatSize(kb: number) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb.toFixed(0)} KB`;
}

const API = () => process.env.NEXT_PUBLIC_API_URL || "/api";
const fetcher = async (url: string) => {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "/"; return []; }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/"; return []; }
  return res.json();
};

export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: arquivos = [], isLoading: loading, mutate } = useSWR<Arquivo[]>(
    `${API()}/arquivos`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const showMsg = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  const uploadFile = async (file: File) => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API()}/arquivos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        showMsg("error", err.detail || "Erro no upload.");
      } else {
        showMsg("success", `"${file.name}" enviado com sucesso!`);
        mutate();
      }
    } catch { showMsg("error", "Falha ao fazer upload."); }
    finally { setUploading(false); }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => uploadFile(f));
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remover "${name}" do banco de dados?`)) return;
    const token = localStorage.getItem("token");
    setDeletingId(id);
    try {
      const res = await fetch(`${API()}/arquivos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) showMsg("error", "Erro ao remover arquivo.");
      else { showMsg("success", `"${name}" removido.`); mutate(); }
    } catch { showMsg("error", "Falha ao remover."); }
    finally { setDeletingId(null); }
  };

  const totalKB = arquivos.reduce((s, a) => s + a.size_kb, 0);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <Upload size={16} className="text-pink-400" />
            </div>
            <span className="text-xs font-bold text-pink-400 uppercase tracking-widest">Uploads</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Gerenciador de Arquivos</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Armazene PDFs e documentos de forma segura no sistema.</p>
        </div>
        <button onClick={() => mutate()} disabled={loading}
          className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/40 text-white px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50 hover:bg-[var(--card-hover)]">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 text-sm animate-pulse ${msg.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {msg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total de Arquivos", value: arquivos.length, icon: <File size={16} />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/15" },
          { label: "Espaço Utilizado", value: formatSize(totalKB), icon: <HardDrive size={16} />, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/15" },
          { label: "Último Upload", value: arquivos[0]?.criado_em ? formatDate(arquivos[0].criado_em) : "—", icon: <Clock size={16} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
        ].map(({ label, value, icon, color, bg, border }) => (
          <div key={label} className={`premium-surface rounded-2xl p-5 border ${border} hover:-translate-y-0.5 transition-transform`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">{label}</span>
              <span className={`${color} ${bg} p-1.5 rounded-lg border border-white/5`}>{icon}</span>
            </div>
            <div className="text-3xl font-extrabold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`premium-surface border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 mb-6 ${dragOver
          ? "border-[var(--primary)] bg-[var(--primary)]/5 scale-[1.01] shadow-[0_0_30px_rgba(20,184,166,0.15)]"
          : "border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--card-hover)]"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3 text-[var(--primary)]">
            <Loader2 size={48} className="animate-spin" />
            <p className="font-semibold text-lg">Enviando arquivo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={`p-5 rounded-full transition-colors duration-300 ${dragOver ? "bg-[var(--primary)]/20 shadow-[0_0_20px_rgba(20,184,166,0.3)]" : "bg-gradient-to-br from-[var(--card)] to-[var(--background)] border border-[var(--border)]"}`}>
              <Upload size={36} className={dragOver ? "text-[var(--primary)]" : "text-[var(--text-muted)]"} />
            </div>
            <div>
              <p className="font-bold text-white text-xl mb-1.5">
                {dragOver ? "Solte os arquivos aqui!" : "Clique ou arraste os arquivos"}
              </p>
              <p className="text-[var(--text-muted)] text-sm font-medium">Suporta PDF, DOCX, e Imagens — Limite de 50MB por arquivo</p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
              className="mt-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-8 py-3 rounded-xl text-sm transition-colors shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] flex items-center gap-2"
            >
              Selecionar Arquivos <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="premium-surface border border-[var(--border)] rounded-2xl overflow-hidden fade-up-delay-1">
        <div className="p-5 border-b border-[var(--border)] flex items-center gap-2 font-semibold text-sm">
          <FileText size={16} className="text-[var(--primary)]" />
          Arquivos no Sistema <span className="bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full text-xs ml-2">{arquivos.length}</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-16 text-[var(--text-muted)]">
            <Loader2 size={24} className="animate-spin mr-3" /> Carregando...
          </div>
        ) : arquivos.length === 0 ? (
          <div className="p-16 text-center">
            <EmptyIllustration variant="upload" size={100} />
            <p className="text-[var(--text-muted)] font-semibold mt-4">Nenhum arquivo armazenado ainda.</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">Use a área acima para realizar uploads.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider bg-[var(--card)]">
                {["#", "Nome do Arquivo", "Tipo", "Tamanho", "Data Upload", "Ações"].map(h => (
                  <th key={h} className="p-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {arquivos.map((a, i) => (
                <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors group">
                  <td className="p-4 text-xs text-[var(--text-muted)]">{i + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                        <FileText size={15} className="text-[var(--primary)]" />
                      </div>
                      <span className="text-sm text-white font-medium max-w-[280px] truncate" title={a.filename}>{a.filename}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-[var(--text-muted)]">
                    <span className="bg-[var(--background)] border border-[var(--border)] px-2 py-1 rounded text-[10px] font-mono">{a.content_type}</span>
                  </td>
                  <td className="p-4 text-sm text-[var(--text-muted)]">{formatSize(a.size_kb)}</td>
                  <td className="p-4 text-xs text-[var(--text-muted)]">{formatDate(a.criado_em)}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleDelete(a.id, a.filename)}
                      disabled={deletingId === a.id}
                      className="text-red-500/60 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 p-2 rounded-lg transition-all disabled:opacity-30 border border-transparent hover:border-red-500/20"
                      title="Remover arquivo"
                    >
                      {deletingId === a.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


