"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, Trash2, AlertCircle, CheckCircle2,
  Loader2, RefreshCw, HardDrive, Clock, File
} from "lucide-react";

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
  return new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function formatSize(kb: number) {
  if (kb >= 1024) return `${(kb/1024).toFixed(1)} MB`;
  return `${kb.toFixed(0)} KB`;
}

export default function UploadPage() {
  const router = useRouter();
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [msg, setMsg] = useState<{type:"success"|"error"; text:string}|null>(null);
  const [deletingId, setDeletingId] = useState<number|null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem("token");
  const API = () => process.env.NEXT_PUBLIC_API_URL || "/api";

  const fetchArquivos = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push("/"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API()}/arquivos`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      setArquivos(await res.json());
    } catch { setMsg({ type:"error", text:"Erro ao carregar arquivos." }); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchArquivos(); }, [fetchArquivos]);

  const showMsg = (type: "success"|"error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const uploadFile = async (file: File) => {
    const token = getToken();
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
        await fetchArquivos();
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
    const token = getToken();
    setDeletingId(id);
    try {
      const res = await fetch(`${API()}/arquivos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) showMsg("error", "Erro ao remover arquivo.");
      else { showMsg("success", `"${name}" removido.`); await fetchArquivos(); }
    } catch { showMsg("error", "Falha ao remover."); }
    finally { setDeletingId(null); }
  };

  const totalKB = arquivos.reduce((s, a) => s + a.size_kb, 0);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-[var(--primary)]/10 text-[var(--primary)] p-2 rounded-lg"><Upload size={24}/></div>
            <h1 className="text-2xl font-bold">Upload de Arquivos</h1>
          </div>
          <p className="text-[var(--text-muted)] text-sm">Gerencie PDFs e documentos armazenados no banco</p>
        </div>
        <button onClick={fetchArquivos} disabled={loading}
          className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] text-white px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={loading?"animate-spin":""}/> Atualizar
        </button>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 text-sm animate-pulse ${
          msg.type==="success"?"bg-green-500/10 border-green-500/30 text-green-400":"bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {msg.type==="success"?<CheckCircle2 size={18}/>:<AlertCircle size={18}/>}
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label:"Total de Arquivos", value:arquivos.length, icon:<File size={16}/> },
          { label:"Espaço Utilizado", value:formatSize(totalKB), icon:<HardDrive size={16}/> },
          { label:"Último Upload", value: arquivos[0]?.criado_em ? formatDate(arquivos[0].criado_em) : "—", icon:<Clock size={16}/> },
        ].map(({label,value,icon})=>(
          <div key={label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider">{label}</span>
              <span className="text-[var(--primary)]">{icon}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);}}
        onClick={()=>inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all mb-6 ${
          dragOver
            ? "border-[var(--primary)] bg-[var(--primary)]/5 scale-[1.01]"
            : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--card-hover)]"
        } ${uploading?"pointer-events-none opacity-60":""}`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e=>handleFiles(e.target.files)}/>
        {uploading ? (
          <div className="flex flex-col items-center gap-3 text-[var(--primary)]">
            <Loader2 size={40} className="animate-spin"/>
            <p className="font-semibold">Enviando arquivo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`p-4 rounded-full transition-colors ${dragOver?"bg-[var(--primary)]/20":"bg-[var(--card)]"}`}>
              <Upload size={32} className={dragOver?"text-[var(--primary)]":"text-[var(--text-muted)]"}/>
            </div>
            <div>
              <p className="font-semibold text-white text-lg mb-1">
                {dragOver ? "Solte os arquivos aqui!" : "Clique ou arraste arquivos"}
              </p>
              <p className="text-[var(--text-muted)] text-sm">PDF, DOCX, imagens — até 50MB por arquivo</p>
            </div>
            <button
              type="button"
              onClick={e=>{e.stopPropagation();inputRef.current?.click();}}
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            >
              Selecionar Arquivo
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] flex items-center gap-2 font-semibold">
          <FileText size={18} className="text-[var(--primary)]"/>
          Arquivos no Banco ({arquivos.length})
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-16 text-[var(--text-muted)]">
            <Loader2 size={24} className="animate-spin mr-3"/> Carregando...
          </div>
        ) : arquivos.length === 0 ? (
          <div className="p-16 text-center">
            <FileText size={48} className="mx-auto mb-4 text-[var(--text-muted)]/30"/>
            <p className="text-[var(--text-muted)] font-medium">Nenhum arquivo armazenado ainda.</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">Use a área acima para enviar arquivos.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider">
                {["#","Nome do Arquivo","Tipo","Tamanho","Data Upload","Ações"].map(h=>(
                  <th key={h} className="p-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {arquivos.map((a,i)=>(
                <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors group">
                  <td className="p-4 text-xs text-[var(--text-muted)]">{i+1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-[var(--primary)]"/>
                      </div>
                      <span className="text-sm text-white font-medium max-w-[280px] truncate" title={a.filename}>{a.filename}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-[var(--text-muted)]">
                    <span className="bg-[var(--background)] px-2 py-0.5 rounded text-[10px] font-mono">{a.content_type}</span>
                  </td>
                  <td className="p-4 text-sm text-[var(--text-muted)]">{formatSize(a.size_kb)}</td>
                  <td className="p-4 text-xs text-[var(--text-muted)]">{formatDate(a.criado_em)}</td>
                  <td className="p-4">
                    <button
                      onClick={()=>handleDelete(a.id, a.filename)}
                      disabled={deletingId===a.id}
                      className="text-red-500/60 hover:text-red-500 transition-colors disabled:opacity-30"
                      title="Remover arquivo"
                    >
                      {deletingId===a.id?<Loader2 size={16} className="animate-spin"/>:<Trash2 size={16}/>}
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
