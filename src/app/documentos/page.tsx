"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileEdit, Search, Loader2, RefreshCw, FileText,
  ChevronRight, AlertCircle, LayoutGrid, List, Building2,
} from "lucide-react";
import EmptyIllustration from "@/components/EmptyIllustration";
import GoogleDocsModal from "@/components/GoogleDocsModal";

interface PatientDoc {
  id: number;
  nome: string;
  empresa: string | null;
  foto: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function DocumentosPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalDocId, setModalDocId] = useState<string | null>(null);
  const [docErrors, setDocErrors] = useState<Record<number, string>>({});
  const [viewMode, setViewMode] = useState<"grid" | "lista">("grid");

  const fetchPatients = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pacientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      const data = await res.json();
      setPatients(Array.isArray(data) ? data : []);
    } catch (e) { console.debug("Erro ao carregar pacientes:", e); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const openEditor = async (patient: PatientDoc) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/pacientes/${patient.id}/document`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        setDocErrors(prev => ({ ...prev, [patient.id]: "Nenhum documento associado." }));
        return;
      }
      const j = await res.json();
      if (j.google_doc_id) {
        setModalDocId(j.google_doc_id);
      }
    } catch (e) {
      console.debug("openEditor: erro ao buscar documento", e);
      setDocErrors(prev => ({ ...prev, [patient.id]: "Erro ao buscar documento." }));
    }
  };

  const filtered = patients.filter(p =>
    !q || p.nome.toLowerCase().includes(q.toLowerCase()) || (p.empresa || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide fade-up">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <FileEdit size={16} className="text-teal-400" />
            </div>
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">Documento</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Editor de Documentos</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Abra o Google Docs para cada paciente e edite diretamente</p>
        </div>
        <button
          onClick={fetchPatients}
          disabled={loading}
          className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/40 text-white px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50 hover:bg-[var(--card-hover)]"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Search + View Toggle — app moderno */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 premium-surface rounded-xl p-3 flex items-center gap-3 border border-[var(--border)] focus-within:border-[var(--primary)]/30 transition-colors">
          <Search size={16} className="text-[var(--text-muted)] flex-shrink-0 ml-1" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar paciente, empresa..."
            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-[var(--text-muted)]"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-[var(--text-muted)] hover:text-white text-xs p-1">✕</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="premium-surface rounded-xl p-1 flex items-center gap-1 border border-[var(--border)]">
            <button onClick={() => setViewMode("grid")} className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode==="grid" ? "bg-[var(--primary)] text-black shadow-md" : "text-[var(--text-muted)] hover:text-white"}`}><LayoutGrid size={14} /> Grid</button>
            <button onClick={() => setViewMode("lista")} className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode==="lista" ? "bg-[var(--primary)] text-black shadow-md" : "text-[var(--text-muted)] hover:text-white"}`}><List size={14} /> Lista</button>
          </div>
          <span className="hidden sm:flex text-xs text-[var(--text-muted)]">{filtered.length} pacientes</span>
        </div>
      </div>

      {/* Patient list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="premium-surface rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full skeleton" />
                <div className="flex-1">
                  <div className="h-4 w-28 skeleton mb-2" />
                  <div className="h-3 w-20 skeleton" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="premium-surface rounded-2xl p-16 text-center">
          <EmptyIllustration variant="search" size={110} />
          <p className="text-[var(--text-muted)] font-medium mt-4">
            {q ? "Nenhum paciente encontrado." : "Nenhum paciente registrado."}
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Registre atendimentos para que pacientes apareçam aqui.</p>
        </div>
      ) : viewMode==="grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((patient, idx) => (
            <div
              key={patient.id}
              className="premium-surface rounded-2xl p-5 border border-[var(--border)] hover:border-[var(--border-light)] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group list-item-fade"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] group-hover:border-[var(--primary)]/30 transition-colors bg-gradient-to-br from-[var(--primary)]/20 to-[var(--card)] flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-[var(--primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white truncate">{patient.nome}</h3>
                  <p className="text-xs text-[var(--text-muted)] truncate">{patient.empresa || "Sem empresa"}</p>
                </div>
              </div>

              {/* Error message */}
              {docErrors[patient.id] && (
                <div className="flex items-center gap-1.5 text-[10px] text-red-400 mb-3 bg-red-500/5 rounded-lg px-2 py-1.5 border border-red-500/10">
                  <AlertCircle size={10} />
                  {docErrors[patient.id]}
                </div>
              )}

              {/* Action */}
              <button
                onClick={() => openEditor(patient)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 hover:border-[var(--primary)]/40 transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_16px_rgba(20,184,166,0.12)]"
              >
                <FileEdit size={13} />
                Abrir Editor
                <ChevronRight size={12} className="opacity-50 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="premium-surface border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {filtered.map(patient => {
              const initials = patient.nome.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join("");
              return (
                <div key={patient.id} className="group flex items-center gap-4 p-4 hover:bg-[var(--card-hover)] transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/20 to-[var(--card)] border border-[var(--border)] group-hover:border-teal-500/30 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{initials || <FileText size={14} />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate group-hover:text-teal-400 transition-colors">{patient.nome}</div>
                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-1 truncate"><Building2 size={10} /> {patient.empresa || "Sem empresa"}</div>
                    {docErrors[patient.id] && <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} />{docErrors[patient.id]}</div>}
                  </div>
                  <button onClick={() => openEditor(patient)} className="hidden sm:inline-flex items-center gap-1.5 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/20 px-3 py-2 rounded-lg text-xs font-bold transition-colors"><FileEdit size={13} /> Editar</button>
                  <button onClick={() => openEditor(patient)} className="sm:hidden p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"><FileEdit size={14} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Google Docs Modal */}
      {modalDocId && (
        <GoogleDocsModal
          docId={modalDocId}
          onClose={() => setModalDocId(null)}
        />
      )}
    </div>
  );
}
