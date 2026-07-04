"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, Search, Filter, Download, ExternalLink, X, Loader2,
  FileCheck, FileClock, AlertCircle, CheckCircle2, Eye
} from "lucide-react";

interface LaudoGerado {
  id: string;
  titulo: string;
  paciente: string;
  tipo: string;
  data: string;
  status: string;
  url: string;
  embed_url: string;
}

interface FormState {
  nome: string;
  cpf: string;
  dataNascimento: string;
  empresa: string;
  dataExame: string;
  motivo: string;
  itensAuxiliados: string;
  conclusao: string;
  tipos: Record<string, boolean>;
}

const TIPOS_AVALIACAO = [
  { key: "avaliacao_psicologica", label: "Avaliação Psicológica" },
  { key: "admissional", label: "Admissional" },
  { key: "periodica", label: "Periódica" },
  { key: "pessoal", label: "Pessoal" },
  { key: "mudanca_funcao", label: "Mudança de Função" },
];

const defaultForm: FormState = {
  nome: "", cpf: "", dataNascimento: "", empresa: "",
  dataExame: new Date().toISOString().slice(0, 10),
  motivo: "", itensAuxiliados: "", conclusao: "",
  tipos: { avaliacao_psicologica: false, admissional: false, periodica: false, pessoal: false, mudanca_funcao: false },
};

export default function LaudosPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingLaudos, setLoadingLaudos] = useState(true);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [laudos, setLaudos] = useState<LaudoGerado[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [templateOk, setTemplateOk] = useState<boolean | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const API = () => process.env.NEXT_PUBLIC_API_URL || "/api";
  const getToken = () => localStorage.getItem("token");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLaudos = async () => {
    const token = getToken();
    if (!token) { router.push("/"); return; }
    setLoadingLaudos(true);
    try {
      const res = await fetch(`${API()}/laudos`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
      const data = await res.json();
      setLaudos(data as LaudoGerado[]);
      try { sessionStorage.setItem("laudos_cache", JSON.stringify(data)); } catch {}
    } catch {
      // lista fica vazia; não bloqueia a UI
    } finally {
      setLoadingLaudos(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/"); return; }
    // show cached laudos immediately for perceived speed
    try {
      const raw = sessionStorage.getItem("laudos_cache");
      if (raw) {
        setLaudos(JSON.parse(raw));
        setLoadingLaudos(false);
        // refresh in background
        setTimeout(() => fetchLaudos(), 100);
      } else {
        fetchLaudos();
      }
    } catch {
      fetchLaudos();
    }
    fetch(`${API()}/laudos/template-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setTemplateOk(d.configurado === true))
      .catch(() => setTemplateOk(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) { router.push("/"); return; }

    setIsGenerating(true);
    // optimistic UI: add temporary placeholder laudo
    const tempId = `tmp-${Date.now()}`;
    const optimistic: LaudoGerado = {
      id: tempId,
      titulo: `Laudo - ${form.nome}`,
      paciente: form.nome,
      tipo: TIPOS_AVALIACAO.filter((t) => form.tipos[t.key]).map((t) => t.label).join(", ") || form.motivo || "Laudo",
      data: new Date().toLocaleDateString("pt-BR"),
      status: "Gerando...",
      url: "",
      embed_url: "",
    };
    setLaudos((prev) => [optimistic, ...prev]);

    try {
      const payload = {
        nome_paciente: form.nome,
        cpf: form.cpf,
        data_nascimento: form.dataNascimento,
        empresa: form.empresa,
        data_exame: form.dataExame,
        motivo_avaliacao: form.motivo,
        itens_auxiliados: form.itensAuxiliados,
        conclusao: form.conclusao,
        avaliacao_psicologica: form.tipos.avaliacao_psicologica,
        admissional: form.tipos.admissional,
        periodica: form.tipos.periodica,
        pessoal: form.tipos.pessoal,
        mudanca_funcao: form.tipos.mudanca_funcao,
      };

      const res = await fetch(`${API()}/laudos/gerar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao gerar laudo");

      const novoDoc: LaudoGerado = {
        id: data.id,
        titulo: data.titulo,
        paciente: form.nome,
        tipo: TIPOS_AVALIACAO.filter((t) => form.tipos[t.key]).map((t) => t.label).join(", ") || form.motivo || "Laudo",
        data: new Date().toLocaleDateString("pt-BR"),
        status: "Gerado",
        url: data.url,
        embed_url: data.embed_url,
      };

      // replace optimistic placeholder with real result
      setLaudos((prev) => [novoDoc, ...prev.filter((l) => l.id !== tempId)]);
      try { sessionStorage.setItem("laudos_cache", JSON.stringify([novoDoc, ...laudos])); } catch {}
      setIsModalOpen(false);
      setForm(defaultForm);
      showToast("success", "Laudo gerado! Abrindo editor…");
      router.push(`/laudos/${novoDoc.id}/editor`);
    } catch (err: unknown) {
      // remove optimistic placeholder
      setLaudos((prev) => prev.filter((l) => !l.id.toString().startsWith("tmp-")));
      showToast("error", err instanceof Error ? err.message : "Falha ao gerar laudo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPdf = async (laudo: LaudoGerado) => {
    const token = getToken();
    if (!token) return;
    setDownloadingId(laudo.id);
    try {
      const res = await fetch(`${API()}/laudos/${laudo.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao exportar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laudo_${laudo.paciente.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setLaudos((prev) => prev.map((l) => l.id === laudo.id ? { ...l, status: "PDF Exportado" } : l));
      showToast("success", "PDF baixado com sucesso!");
    } catch {
      showToast("error", "Falha ao exportar PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const inputClass = "w-full bg-[#111811] border border-[#1e2e1e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--primary)] focus:bg-[#151f15] transition-colors shadow-inner";

  return (
    <div className="p-4 sm:p-8 w-full h-full overflow-y-auto scrollbar-hide bg-[#050a06] relative">

      {toast && (
        <div className={`fixed top-16 md:top-6 right-4 left-4 sm:left-auto sm:w-auto px-4 py-3 rounded-lg flex items-center gap-2 shadow-xl z-50 text-white font-medium text-sm ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">Laudos e Documentos</h1>
          <p className="text-[var(--text-label)] font-medium text-sm">Gerenciamento automático de relatórios integrados ao Google Docs.</p>
          {templateOk === false && (
            <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
              <AlertCircle size={14} /> Configure o template em Configurações &gt; Integrações.
            </p>
          )}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-[var(--primary)] to-green-600 hover:from-green-500 hover:to-green-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_4px_15px_rgba(34,197,94,0.3)] transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} strokeWidth={2.5} /> Novo Laudo Inteligente
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-blue-400"><FileText size={24} /></div>
          <div>
            <p className="text-[var(--text-label)] text-xs font-medium mb-0.5">Laudos Gerados</p>
            <h4 className="text-2xl font-bold text-white">{laudos.length}</h4>
          </div>
        </div>
        <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="bg-[var(--primary)]/10 p-3 rounded-xl border border-[var(--primary)]/20 text-[var(--primary)]"><FileCheck size={24} /></div>
          <div>
            <p className="text-[var(--text-label)] text-xs font-medium mb-0.5">Com PDF</p>
            <h4 className="text-2xl font-bold text-white">{laudos.filter((l) => l.status.includes("PDF")).length}</h4>
          </div>
        </div>
        <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-amber-400"><FileClock size={24} /></div>
          <div>
            <p className="text-[var(--text-label)] text-xs font-medium mb-0.5">Aguardando Assinatura</p>
            <h4 className="text-2xl font-bold text-white">{laudos.filter((l) => l.status === "Gerado").length}</h4>
          </div>
        </div>
      </div>

      <div className="bg-[#0a100a] border border-[#1e2e1e] rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#1e2e1e] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-bold text-white">Documentos Recentes</h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7c6b]" size={16} />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full bg-[#111811] border border-[#1e2e1e] rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <button onClick={fetchLaudos} disabled={loadingLaudos} className="bg-[#111811] border border-[#1e2e1e] p-2 rounded-lg text-[#9ca89c] hover:text-white disabled:opacity-50" title="Atualizar lista">
              {loadingLaudos ? <Loader2 size={18} className="animate-spin" /> : <Filter size={18} />}
            </button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text-label)]">
            <thead className="bg-[#111811] text-xs uppercase font-semibold tracking-wider text-[#6b7c6b]">
              <tr>
                <th className="px-6 py-4">ID do Doc</th>
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2e1e]">
              {loadingLaudos ? (
                  // skeleton rows for perceived speed
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="group list-item-fade">
                      <td className="px-6 py-4"><div className="h-4 w-40 skeleton rounded-md" /></td>
                      <td className="px-6 py-4"><div className="h-5 w-48 skeleton rounded-md" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 skeleton rounded-md" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 skeleton rounded-md" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 skeleton rounded-full" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-8 w-24 skeleton rounded-xl inline-block" /></td>
                    </tr>
                  ))
                ) : laudos.filter((l) => !searchQ || l.paciente.toLowerCase().includes(searchQ.toLowerCase())).length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">{searchQ ? "Nenhum laudo encontrado para a busca." : "Nenhum laudo gerado ainda."}</td></tr>
              ) : laudos.filter((l) => !searchQ || l.paciente.toLowerCase().includes(searchQ.toLowerCase())).map((laudo) => (
                <tr key={laudo.id} className="hover:bg-[#111811]/50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs truncate max-w-[120px]">{laudo.id.slice(0, 12)}…</td>
                  <td className="px-6 py-4 font-bold text-white">{laudo.paciente}</td>
                  <td className="px-6 py-4">{laudo.tipo}</td>
                  <td className="px-6 py-4">{laudo.data}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${laudo.status === "Gerado" ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                      {laudo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => router.push(`/laudos/${laudo.id}/editor`)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg" title="Abrir editor completo"><Eye size={16} /></button>
                      <a href={laudo.url} target="_blank" rel="noopener noreferrer" className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-white/5 rounded-lg" title="Abrir em nova aba"><ExternalLink size={16} /></a>
                      <button onClick={() => downloadPdf(laudo)} disabled={downloadingId === laudo.id} className="p-2 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg disabled:opacity-50" title="Baixar PDF">
                        {downloadingId === laudo.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-[#1e2e1e]">
          {loadingLaudos ? (
            // mobile skeleton cards
            Array.from({ length: 3 }).map((_, i) => (
              <div key={`mskel-${i}`} className="p-4 space-y-3 list-item-fade">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="h-4 w-36 skeleton rounded-md" />
                    <div className="h-3 w-28 mt-2 skeleton rounded-md" />
                  </div>
                  <div className="h-5 w-16 skeleton rounded-full" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-9 skeleton rounded-lg" />
                  <div className="flex-1 h-9 skeleton rounded-lg" />
                </div>
              </div>
            ))
          ) : laudos.filter((l) => !searchQ || l.paciente.toLowerCase().includes(searchQ.toLowerCase())).length === 0 ? (
            <p className="p-8 text-center text-[var(--text-muted)] text-sm">{searchQ ? "Nenhum laudo encontrado." : "Nenhum laudo gerado ainda."}</p>
          ) : laudos.filter((l) => !searchQ || l.paciente.toLowerCase().includes(searchQ.toLowerCase())).map((laudo) => (
            <div key={laudo.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-bold text-white">{laudo.paciente}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{laudo.tipo}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--primary)]/10 text-[var(--primary)]">{laudo.status}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => router.push(`/laudos/${laudo.id}/editor`)} className="flex-1 py-2 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">Abrir Editor</button>
                <button onClick={() => downloadPdf(laudo)} disabled={downloadingId === laudo.id} className="flex-1 py-2 text-xs font-medium rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 disabled:opacity-50">
                  {downloadingId === laudo.id ? "Exportando…" : "PDF"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal — Novo Laudo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !isGenerating && setIsModalOpen(false)} />
          <div className="relative w-full sm:max-w-4xl bg-[#0a100a] border border-[#1e2e1e] sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-[#1e2e1e] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-[var(--primary)]/10 p-2.5 rounded-xl text-[var(--primary)]"><FileText size={22} /></div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">Novo Laudo Inteligente</h2>
                  <p className="text-xs text-[#6b7c6b]">Preencha os dados para gerar via Google Docs</p>
                </div>
              </div>
              <button disabled={isGenerating} onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg text-[#6b7c6b] hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-4 sm:p-8 overflow-y-auto flex-1">
              <form id="laudo-form" onSubmit={handleGenerate} className="space-y-6 sm:space-y-8">
                <div>
                  <h3 className="text-xs font-bold text-[var(--primary)] mb-4 uppercase tracking-widest border-b border-[#1e2e1e] pb-2">Identificação</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="text-xs font-semibold text-[#9ca89c] block mb-1">Nome Completo</label>
                      <input required type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputClass} placeholder="Ex: João da Silva" /></div>
                    <div><label className="text-xs font-semibold text-[#9ca89c] block mb-1">CPF</label>
                      <input required type="text" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className={inputClass} placeholder="000.000.000-00" /></div>
                    <div><label className="text-xs font-semibold text-[#9ca89c] block mb-1">Data de Nascimento</label>
                      <input required type="date" value={form.dataNascimento} onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })} className={inputClass} /></div>
                    <div><label className="text-xs font-semibold text-[#9ca89c] block mb-1">Empresa</label>
                      <input type="text" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} className={inputClass} placeholder="Nome da empresa" /></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[var(--primary)] mb-4 uppercase tracking-widest border-b border-[#1e2e1e] pb-2">Avaliação</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div><label className="text-xs font-semibold text-[#9ca89c] block mb-1">Data do Exame</label>
                      <input required type="date" value={form.dataExame} onChange={(e) => setForm({ ...form, dataExame: e.target.value })} className={inputClass} /></div>
                    <div><label className="text-xs font-semibold text-[#9ca89c] block mb-1">Motivo</label>
                      <input required type="text" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={inputClass} placeholder="Ex: Avaliação Periódica" /></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TIPOS_AVALIACAO.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer bg-[#111811] border border-[#1e2e1e] px-3 py-2 rounded-xl text-sm has-[:checked]:border-[var(--primary)]">
                        <input type="checkbox" checked={form.tipos[key]} onChange={(e) => setForm({ ...form, tipos: { ...form.tipos, [key]: e.target.checked } })} className="accent-[var(--primary)]" />
                        <span className="text-[#e8f5e8]">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[var(--primary)] mb-4 uppercase tracking-widest border-b border-[#1e2e1e] pb-2">Conteúdo Técnico</h3>
                  <div className="space-y-4">
                    <div><label className="text-xs font-semibold text-[#9ca89c] block mb-1">Itens Auxiliados</label>
                      <textarea value={form.itensAuxiliados} onChange={(e) => setForm({ ...form, itensAuxiliados: e.target.value })} className={`${inputClass} min-h-[80px] resize-y`} placeholder="Testes e métodos aplicados..." /></div>
                    <div><label className="text-xs font-semibold text-[#9ca89c] block mb-1">Conclusão / Parecer</label>
                      <textarea value={form.conclusao} onChange={(e) => setForm({ ...form, conclusao: e.target.value })} className={`${inputClass} min-h-[100px] resize-y`} placeholder="Parecer final..." /></div>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 sm:p-6 border-t border-[#1e2e1e] flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button type="button" disabled={isGenerating} onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-[#9ca89c] hover:bg-[#1e2e1e]">Cancelar</button>
              <button type="submit" form="laudo-form" disabled={isGenerating} className="bg-gradient-to-r from-[var(--primary)] to-green-600 text-[#052e16] px-8 py-2.5 rounded-xl font-extrabold flex items-center justify-center gap-2 disabled:opacity-70">
                {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Gerando…</> : <><FileCheck size={18} /> Gerar Laudo</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
