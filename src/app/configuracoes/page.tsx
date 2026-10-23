"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Settings as SettingsIcon, Save, Building2, UserCircle, History, RefreshCw, CheckCircle2,
  AlertCircle, Upload as UploadIcon, ShieldAlert, Trash2,
} from "lucide-react";
import EmptyIllustration from "@/components/EmptyIllustration";
import { API as API_BASE } from "@/lib/api";
import { mutate as globalMutate } from "swr";

interface Clinica { id: number; name: string; document: string; }
interface ClinicaConfig {
  clinic_name: string; clinic_logo_base64: string | null; user_photo_base64: string | null;
  clinic_logo_stored_base64?: string | null; user_photo_stored_base64?: string | null;
  app_bg_custom?: string | null; app_bg_stored?: string | null;
  app_background?: string | null;
  [key: string]: string | null | undefined;
}
interface AuditLog { id: number; acao: string; entidade: string; entidade_id: number | null; detalhes: string; usuario: string; criado_em: string; }

type PhotoField = "clinic_logo" | "user_photo" | "app_background";
const KEY_BY_FIELD: Record<PhotoField, string> = {
  clinic_logo: "clinic_logo_base64",
  user_photo: "user_photo_base64",
  app_background: "app_bg_custom",
};
const STORED_KEY_BY_FIELD: Record<PhotoField, string> = {
  clinic_logo: "clinic_logo_stored_base64",
  user_photo: "user_photo_stored_base64",
  app_background: "app_bg_stored",
};

export default function ConfigPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"clinica" | "perfil" | "auditoria">("clinica");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [config, setConfig] = useState<ClinicaConfig>({ clinic_name: "", clinic_logo_base64: null, user_photo_base64: null });
  const [uploading, setUploading] = useState<"clinic_logo" | "user_photo" | null>(null);
  const [removing, setRemoving] = useState<PhotoField | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const [accent, setAccent] = useState<string>((() => {
    try { return localStorage.getItem("accent") || "esmeralda"; } catch { return "esmeralda"; }
  })());
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      const tk = getToken();
      if (!tk) { router.push("/"); return; }
      setLoading(true);
      try {
        const [cRes, logsRes] = await Promise.all([
          fetch(`${API_BASE}/configuracoes`, { headers: { Authorization: `Bearer ${tk}` } }),
          fetch(`${API_BASE}/auditoria`, { headers: { Authorization: `Bearer ${tk}` } }),
        ]);
        if (cRes.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
        if (cRes.ok) {
          const d = await cRes.json();
          setClinica(d.clinica);
          setConfig(d.clinica || { clinic_name: "", clinic_logo_base64: null, user_photo_base64: null });
          const acc = (d.clinica as unknown as { accent_color?: string })?.accent_color;
          if (acc) { setAccent(acc); document.documentElement.setAttribute("data-accent", acc); localStorage.setItem("accent", acc); }
          const dCl = (d.clinica || {}) as Record<string, string>;
          if (dCl.app_background === "custom" && dCl.app_bg_custom) {
            setAppBg("custom");
            document.documentElement.setAttribute("data-bg", "custom");
            document.documentElement.style.setProperty("--bg-custom", `url("${dCl.app_bg_custom}")`);
            try { localStorage.setItem("app_bg", "custom"); localStorage.setItem("app_bg_custom", dCl.app_bg_custom); } catch {}
          }
        }
        if (logsRes.ok) setLogs(await logsRes.json());
      } catch (e) { console.debug("Erro ao carregar configurações:", e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [router]);

  const showMsg = (t: "success" | "error", text: string) => {
    setMsg({ type: t, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const [appBg, setAppBg] = useState("clinica");
  useEffect(() => {
    const stored = localStorage.getItem("app_bg") || "";
    if (["clinica", "grafite", "esmeralda", "custom"].includes(stored)) setAppBg(stored);
    if (stored === "custom") {
      const cached = localStorage.getItem("app_bg_custom");
      if (cached) document.documentElement.style.setProperty("--bg-custom", `url("${cached}")`);
      document.documentElement.setAttribute("data-bg", "custom");
    }
  }, []);
  const applyBg = async (id: string) => {
    setAppBg(id);
    document.documentElement.setAttribute("data-bg", id);
    localStorage.setItem("app_bg", id);
    try {
      const token = localStorage.getItem("token");
      await fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ app_background: id }),
      });
    } catch {}
  };

  const ACCENTS: { id: string; nome: string; hex: string }[] = [
    { id: "esmeralda", nome: "Esmeralda", hex: "#4DA768" },
    { id: "petroleo", nome: "Azul-petróleo", hex: "#2E86AB" },
    { id: "vinho", nome: "Vinho", hex: "#C05650" },
    { id: "dourado", nome: "Dourado", hex: "#C99A27" },
  ];

  const applyAccent = async (id: string) => {
    setAccent(id);
    document.documentElement.setAttribute("data-accent", id === "esmeralda" ? "" : id);
    if (id === "esmeralda") document.documentElement.removeAttribute("data-accent");
    try { localStorage.setItem("accent", id === "esmeralda" ? "" : id); } catch {}
    const tk = getToken();
    if (!tk) return;
    try {
      await fetch(`${API_BASE}/configuracoes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ accent_color: id === "esmeralda" ? "" : id }),
      });
    } catch { /* silencioso — visual já aplicado */ }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const tk = getToken();
    if (!tk) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/configuracoes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` },
        body: JSON.stringify(config),
      });
      if (res.ok) showMsg("success", "Configurações salvas com sucesso!");
      else showMsg("error", "Erro ao salvar.");
    } catch { showMsg("error", "Erro de conexão."); }
    finally { setSaving(false); }
  };

  /* Redimensiona a imagem no navegador (logos ficam leves) e dá upload instantâneo
     no endpoint dedicado /api/configuracoes/photo — logo marca e foto de perfil são
     opções independentes, cada uma salva na própria chave. */
  const compressImage = (f: File, maxSide: number): Promise<string> => new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const sc = Math.min(1, maxSide / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.width * sc));
      cv.height = Math.max(1, Math.round(img.height * sc));
      const ctx = cv.getContext("2d");
      if (!ctx) return reject(new Error("ctx"));
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      const mime = f.type === "image/png" ? "image/png" : "image/jpeg";
      resolve(cv.toDataURL(mime, 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "clinic_logo" | "user_photo") => {
    const f = e.target.files?.[0];
    if (f) e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { showMsg("error", "Envie um arquivo de imagem (PNG ou JPG)."); return; }
    const stateKey = field === "clinic_logo" ? "clinic_logo_base64" : "user_photo_base64";
    setUploading(field);
    try {
      const b64 = await compressImage(f, field === "clinic_logo" ? 640 : 400);
      const tk = getToken();
      if (!tk) throw new Error("auth");
      const blob = await (await fetch(b64)).blob();
      const fd = new FormData();
      fd.append("field", field);
      fd.append("file", new File([blob], field === "clinic_logo" ? "logo.png" : "perfil.png", { type: blob.type }));
      const res = await fetch(`${API_BASE}/configuracoes/photo`, { method: "POST", headers: { Authorization: `Bearer ${tk}` }, body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || "Falha no upload.");
      }
      setConfig(prev => ({ ...prev, [stateKey]: b64 }));
      showMsg("success", field === "clinic_logo" ? "Logo da marca atualizada." : "Foto de perfil atualizada.");
      globalMutate(`${API_BASE}/configuracoes`);
    } catch (err: unknown) {
      showMsg("error", err instanceof Error && err.message !== "auth" ? err.message : "Falha ao enviar imagem.");
    } finally { setUploading(null); }
  };

  /* Remover: limpa o slot (o lugar volta ao estado vazio) mas guarda o dadoUri
     na biblioteca (*_stored) para ser recuperado via "Restaurar última". */
  const removePhoto = async (field: PhotoField) => {
    const tk = getToken();
    if (!tk) return;
    setRemoving(field);
    try {
      const res = await fetch(`${API_BASE}/configuracoes/photo?field=${field}`, { method: "DELETE", headers: { Authorization: `Bearer ${tk}` } });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.detail || "Falha ao remover."); }
      setConfig(prev => {
        const prevAny = prev as Record<string, string | null>;
        return {
          ...prev,
          [STORED_KEY_BY_FIELD[field]]: prevAny[STORED_KEY_BY_FIELD[field]] || prevAny[KEY_BY_FIELD[field]] || null,
          [KEY_BY_FIELD[field]]: null,
        } as ClinicaConfig;
      });
      if (field === "app_background") {
        setAppBg("clinica");
        document.documentElement.setAttribute("data-bg", "clinica");
        try { localStorage.setItem("app_bg", "clinica"); localStorage.removeItem("app_bg_custom"); } catch {}
      }
      showMsg("success", field === "app_background" ? "Fundo removido — foto guardada para reutilizar." : "Foto removida — guardada para reutilizar.");
    } catch (err: unknown) {
      showMsg("error", err instanceof Error && err.message !== "auth" ? err.message : "Erro ao remover a foto.");
    } finally { setRemoving(null); }
  };

  /* Restaurar: recoloca a última foto guardada da biblioteca no slot. */
  const restorePhoto = async (field: PhotoField) => {
    const tk = getToken();
    if (!tk) return;
    setRemoving(field);
    try {
      const fd = new FormData();
      fd.append("field", field);
      fd.append("restore", "1");
      const res = await fetch(`${API_BASE}/configuracoes/photo`, { method: "POST", headers: { Authorization: `Bearer ${tk}` }, body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.detail || "Falha ao restaurar."); }
      setConfig(prev => ({ ...prev, [KEY_BY_FIELD[field]]: (prev as Record<string, string | null>)[STORED_KEY_BY_FIELD[field]] || null } as ClinicaConfig));
      if (field === "app_background") {
        const stored = (config as Record<string, string | null>)[STORED_KEY_BY_FIELD.app_background];
        setAppBg("custom");
        document.documentElement.setAttribute("data-bg", "custom");
        if (stored) document.documentElement.style.setProperty("--bg-custom", `url("${stored}")`);
        const cached = stored || localStorage.getItem("app_bg_custom") || null;
        try { localStorage.setItem("app_bg", "custom"); if (cached) localStorage.setItem("app_bg_custom", cached); } catch {}
      }
      showMsg("success", field === "app_background" ? "Fundo próprio restaurado." : "Foto restaurada.");
    } catch (err: unknown) {
      showMsg("error", err instanceof Error && err.message !== "auth" ? err.message : "Erro ao restaurar a foto.");
    } finally { setRemoving(null); }
  };

  /* Fundo próprio: foto enviada vira o ambiente do sistema (data-bg="custom"). */
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { showMsg("error", "Envie um arquivo de imagem (PNG ou JPG)."); return; }
    const tk = getToken();
    if (!tk) return;
    setBgUploading(true);
    try {
      const b64 = await compressImage(f, 1280);
      const blob = await (await fetch(b64)).blob();
      const fd = new FormData();
      fd.append("field", "app_background");
      fd.append("file", new File([blob], "fundo.png", { type: blob.type }));
      const res = await fetch(`${API_BASE}/configuracoes/photo`, { method: "POST", headers: { Authorization: `Bearer ${tk}` }, body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.detail || "Falha no upload do fundo."); }
      setAppBg("custom");
      document.documentElement.setAttribute("data-bg", "custom");
      document.documentElement.style.setProperty("--bg-custom", `url("${b64}")`);
      setConfig(prev => ({ ...prev, app_bg_custom: b64, app_background: "custom" } as ClinicaConfig));
      try { localStorage.setItem("app_bg", "custom"); localStorage.setItem("app_bg_custom", b64); } catch {}
      showMsg("success", "Fundo do sistema atualizado.");
    } catch (err: unknown) {
      showMsg("error", err instanceof Error && err.message !== "auth" ? err.message : "Falha ao enviar fundo.");
    } finally { setBgUploading(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
              <SettingsIcon size={16} className="text-slate-400" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configurações</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Painel de Controle</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Gerencie informações da clínica, perfil e logs.</p>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 text-sm animate-pulse ${msg.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {msg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Menu Lateral das Configurações */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="premium-surface rounded-2xl p-3 border border-[var(--border)] flex flex-col gap-1 sticky top-4">
            {[
              { id: "clinica", label: "Dados da Clínica", icon: Building2 },
              { id: "perfil", label: "Perfil de Usuário", icon: UserCircle },
              { id: "auditoria", label: "Auditoria & Logs", icon: History },
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "clinica" | "perfil" | "auditoria")}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "bg-[var(--primary)]/10 text-[var(--primary)] shadow-[0_0_15px_rgba(77,167,104,0.1)] border border-[var(--primary)]/20"
                      : "text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-white border border-transparent"
                  }`}
                >
                  <tab.icon size={18} className={active ? "text-[var(--primary)]" : "text-[var(--text-muted)] group-hover:text-white"} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="premium-surface rounded-2xl p-10 flex flex-col items-center justify-center border border-[var(--border)]">
              <RefreshCw size={32} className="animate-spin text-[var(--primary)] mb-4" />
              <p className="text-[var(--text-muted)] font-medium">Carregando painel...</p>
            </div>
          ) : (
            <div className="premium-surface rounded-2xl border border-[var(--border)] overflow-hidden fade-up-delay-1">
              {/* Clínica Tab */}
              {activeTab === "clinica" && (
                <form onSubmit={handleSave}>
                  <div className="p-6 sm:p-8 border-b border-[var(--border)] flex flex-col gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors bg-[var(--card)] flex items-center justify-center overflow-hidden cursor-pointer group relative shadow-inner" onClick={() => logoRef.current?.click()}>
                        {uploading === "clinic_logo" ? (
                          <RefreshCw size={22} className="animate-spin text-[var(--primary)]" />
                        ) : config.clinic_logo_base64 ? (
                          <>
                            <Image src={config.clinic_logo_base64} alt="Logo" width={96} height={96} unoptimized className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <UploadIcon size={20} className="text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="text-center group-hover:text-[var(--primary)] transition-colors">
                            <Building2 size={28} className="mx-auto mb-1 opacity-50" />
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Adicionar logo</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" ref={logoRef} className="hidden" onChange={e => handleUpload(e, "clinic_logo")} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white mb-1">Identidade Visual da Clínica</h2>
                        <p className="text-sm text-[var(--text-muted)] max-w-md">Clique no quadro para adicionar a foto da logo marca da sua clínica. Ela aparece no menu lateral, no login e no papel timbrado dos laudos — salva na hora, sem precisar de Salvar.</p>
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => logoRef.current?.click()} className="btn-motion inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card-hover)] text-[11px] font-bold text-white hover:border-[var(--primary)]/60 transition-all">
                            <UploadIcon size={12} /> {config.clinic_logo_base64 ? "Adicionar nova" : "Adicionar foto"}
                          </button>
                          <button type="button" onClick={() => removePhoto("clinic_logo")} disabled={!config.clinic_logo_base64 || removing === "clinic_logo"} className="btn-motion inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[11px] font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-40 transition-all" title={!config.clinic_logo_base64 ? "Não há foto para remover no lugar" : "Remove a foto (fica guardada na biblioteca)"}>
                            {removing === "clinic_logo" ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />} Remover
                          </button>
                          {!config.clinic_logo_base64 && !!(config as Record<string, string | null>).clinic_logo_stored_base64 && (
                            <button type="button" onClick={() => restorePhoto("clinic_logo")} className="btn-motion inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[11px] font-bold text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-all">
                              <History size={12} /> Restaurar última
                            </button>
                          )}
                        </div>
                        <div className="mt-3">
                          <label className="block text-[10px] font-bold text-[var(--text-label)] uppercase tracking-wider mb-2">Cor de identidade (accent)</label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {ACCENTS.map(a => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => applyAccent(a.id)}
                                title={a.nome}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold transition-all btn-motion ${accent === a.id ? "border-[var(--border-light)] bg-[var(--card-hover)] text-white shadow-md" : "border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--card-hover)]"}`}
                              >
                                <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ background: a.hex }} />
                                {a.nome}
                                {accent === a.id && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-2">Aplica na hora na área de conteúdo do sistema (login e menu permanecem na marca esmeralda).</p>
                        <div className="accent-preview">
                          <span className="accent-preview-label">Prévia ao vivo</span>
                          <div className="accent-preview-row">
                            <span className="accent-preview-btn" style={{ background: "var(--primary)" }}>Botão primário</span>
                            <span className="accent-preview-chip" style={{ color: "var(--primary)", borderColor: "var(--primary)" }}>Badge ativa</span>
                            <span className="accent-preview-ball" style={{ background: "var(--primary)" }} />
                            <span className="accent-preview-bar" style={{ background: "linear-gradient(90deg, transparent, var(--primary), transparent)" }} />
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">Nome Fantasia</label>
                        <input type="text" value={config.clinic_name} onChange={e => setConfig({ ...config, clinic_name: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_2px_rgba(77,167,104,0.1)] transition-all" placeholder="Nome da Clínica" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">CNPJ / Documento</label>
                        <input type="text" value={clinica?.document || ""} disabled className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-muted)] cursor-not-allowed opacity-70" />
                        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">Documento vinculado à assinatura. Contate o suporte para alterar.</p>
                      </div>
                    </div>

                      <div className="border-t border-[var(--border)] pt-5">
                        <h2 className="text-lg font-bold text-white mb-1">Fundo do Sistema</h2>
                        <p className="text-sm text-[var(--text-muted)] mb-3">Escolha o ambiente de fundo da área de trabalho — aplica e salva na hora.</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <button type="button" onClick={() => applyBg("clinica")} className={`bg-thumb ${appBg === "clinica" ? "bg-thumb-on" : ""}`} title="Foto da clínica">
                            <span className="bg-thumb-img" style={{ backgroundImage: "url(/bg-clinic.jpg)" }} />
                            <span className="bg-thumb-label">Clínica</span>
                          </button>
                          <button type="button" onClick={() => applyBg("grafite")} className={`bg-thumb ${appBg === "grafite" ? "bg-thumb-on" : ""}`} title="Grafite sólido">
                            <span className="bg-thumb-img bg-thumb-grafite" />
                            <span className="bg-thumb-label">Grafite</span>
                          </button>
                          <button type="button" onClick={() => applyBg("esmeralda")} className={`bg-thumb ${appBg === "esmeralda" ? "bg-thumb-on" : ""}`} title="Esmeralda profundo">
                            <span className="bg-thumb-img bg-thumb-esmeralda" />
                            <span className="bg-thumb-label">Esmeralda</span>
                          </button>
                          {appBg === "custom" && (
                            <button type="button" className="bg-thumb bg-thumb-on" title="Fundo personalizado">
                              <span className="bg-thumb-img bg-thumb-custom" />
                              <span className="bg-thumb-label">Própria</span>
                            </button>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => bgRef.current?.click()} disabled={bgUploading} className="btn-motion inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card-hover)] text-[11px] font-bold text-white hover:border-[var(--primary)]/60 disabled:opacity-50 transition-all">
                            {bgUploading ? <RefreshCw size={12} className="animate-spin" /> : <UploadIcon size={12} />} {appBg === "custom" ? "Adicionar nova" : "Adicionar foto"}
                          </button>
                          <button type="button" onClick={() => removePhoto("app_background")} disabled={appBg !== "custom" || removing === "app_background"} className="btn-motion inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[11px] font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-40 transition-all" title={appBg !== "custom" ? "Não há fundo próprio ativo para remover" : "Remove o fundo próprio (fica guardado na biblioteca)"}>
                            {removing === "app_background" ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />} Remover
                          </button>
                          {appBg !== "custom" && !!(config as Record<string, string | null>).app_bg_stored && (
                            <button type="button" onClick={() => restorePhoto("app_background")} className="btn-motion inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[11px] font-bold text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-all">
                              <History size={12} /> Restaurar última
                            </button>
                          )}
                          <input type="file" accept="image/*" ref={bgRef} className="hidden" onChange={handleBgUpload} />
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mt-2">Sua foto própria vira o fundo do sistema. Remover volta ao padrão Clínica — a foto permanece guardada para reutilizar depois.</p>
                      </div>
                  </div>
                  <div className="bg-[var(--card)] px-6 py-4 flex justify-end gap-3">
                    <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(77,167,104,0.25)] hover:shadow-[0_0_25px_rgba(77,167,104,0.4)] disabled:opacity-50">
                      {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Salvar Alterações
                    </button>
                  </div>
                </form>
              )}

              {/* Perfil Tab */}
              {activeTab === "perfil" && (
                <form onSubmit={handleSave}>
                  <div className="p-6 sm:p-8 border-b border-[var(--border)] flex flex-col gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-full border-2 border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors bg-[var(--card)] flex items-center justify-center overflow-hidden cursor-pointer group relative shadow-[0_0_20px_rgba(0,0,0,0.5)]" onClick={() => photoRef.current?.click()}>
                        {uploading === "user_photo" ? (
                          <RefreshCw size={22} className="animate-spin text-[var(--primary)]" />
                        ) : config.user_photo_base64 ? (
                          <>
                            <Image src={config.user_photo_base64} alt="Avatar" width={96} height={96} unoptimized className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                              <UploadIcon size={20} className="text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="text-center group-hover:text-[var(--primary)] transition-colors">
                            <UserCircle size={32} className="mx-auto mb-1 opacity-50" />
                          </div>
                        )}
                        <input type="file" accept="image/*" ref={photoRef} className="hidden" onChange={e => handleUpload(e, "user_photo")} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white mb-1">Foto de Perfil</h2>
                        <p className="text-sm text-[var(--text-muted)] max-w-md">Personalize seu avatar que aparece na barra lateral e em anotações.</p>
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => removePhoto("user_photo")} disabled={!config.user_photo_base64 || removing === "user_photo"} className="btn-motion inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-[11px] font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-40 transition-all" title={!config.user_photo_base64 ? "Não há foto para remover no lugar" : "Remove a foto (fica guardada na biblioteca)"}>
                            {removing === "user_photo" ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />} Remover
                          </button>
                          {!config.user_photo_base64 && !!(config as Record<string, string | null>).user_photo_stored_base64 && (
                            <button type="button" onClick={() => restorePhoto("user_photo")} className="btn-motion inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[11px] font-bold text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-all">
                              <History size={12} /> Restaurar última
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[var(--card)] px-6 py-4 flex justify-end gap-3">
                    <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(77,167,104,0.25)] hover:shadow-[0_0_25px_rgba(77,167,104,0.4)] disabled:opacity-50">
                      {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Atualizar Perfil
                    </button>
                  </div>
                </form>
              )}

              {/* Auditoria Tab */}
              {activeTab === "auditoria" && (
                <div className="p-0">
                  <div className="p-6 border-b border-[var(--border)] bg-amber-500/5">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <ShieldAlert size={20} className="text-amber-500" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white mb-1">Registro de Auditoria de Acessos</h2>
                        <p className="text-xs text-[var(--text-muted)]">Histórico imutável de acessos e modificações no sistema, em conformidade com as diretrizes da LGPD.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {logs.length === 0 ? (
                      <div className="text-center py-10 bg-[var(--card)] rounded-xl border border-[var(--border)]">
                        <EmptyIllustration variant="document" size={70} />
                        <p className="text-[var(--text-muted)] text-sm mt-3">Nenhum registro encontrado.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {logs.map(log => (
                          <div key={log.id} className="group flex gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card-hover)] hover:border-[var(--border-light)] transition-colors">
                            <div className="flex flex-col items-center pt-1">
                              <div className="w-2 h-2 rounded-full bg-[var(--primary)] group-hover:shadow-[0_0_8px_rgba(77,167,104,0.6)] transition-shadow" />
                              <div className="w-px h-full bg-[var(--border)] mt-2" />
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-start justify-between mb-1">
                                <div className="text-sm font-bold text-white">{log.acao} — {log.entidade}</div>
                                <div className="text-[10px] text-[var(--text-muted)] bg-[var(--background)] px-2 py-1 rounded-md font-mono border border-[var(--border)]">
                                  {new Date(log.criado_em).toLocaleString("pt-BR")}
                                </div>
                              </div>
                              <div className="text-xs text-[var(--text-muted)] leading-relaxed">{log.detalhes}</div>
                              <div className="mt-2 text-[10px] font-semibold text-[var(--text-label)] uppercase tracking-wider">
                                Usuário: {log.usuario}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
