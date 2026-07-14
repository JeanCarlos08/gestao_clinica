"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Settings as SettingsIcon, Save, Building2, UserCircle, History, RefreshCw, CheckCircle2,
  AlertCircle, Upload as UploadIcon, ShieldAlert,
} from "lucide-react";
import EmptyIllustration from "@/components/EmptyIllustration";

interface Clinica { id: number; name: string; document: string; }
interface ClinicaConfig { clinic_name: string; clinic_logo_base64: string | null; user_photo_base64: string | null; }
interface AuditLog { id: number; acao: string; entidade: string; entidade_id: number | null; detalhes: string; usuario: string; criado_em: string; }

export default function ConfigPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"clinica" | "perfil" | "auditoria">("clinica");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [config, setConfig] = useState<ClinicaConfig>({ clinic_name: "", clinic_logo_base64: null, user_photo_base64: null });
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const API = () => process.env.NEXT_PUBLIC_API_URL || "/api";
  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      const tk = getToken();
      if (!tk) { router.push("/"); return; }
      setLoading(true);
      try {
        const [cRes, logsRes] = await Promise.all([
          fetch(`${API()}/configuracoes`, { headers: { Authorization: `Bearer ${tk}` } }),
          fetch(`${API()}/auditoria`, { headers: { Authorization: `Bearer ${tk}` } }),
        ]);
        if (cRes.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
        if (cRes.ok) {
          const d = await cRes.json();
          setClinica(d.clinica);
          setConfig(d.clinica || { clinic_name: "", clinic_logo_base64: null, user_photo_base64: null });
        }
        if (logsRes.ok) setLogs(await logsRes.json());
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, [router]);

  const showMsg = (t: "success" | "error", text: string) => {
    setMsg({ type: t, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const tk = getToken();
    if (!tk) return;
    setSaving(true);
    try {
      const res = await fetch(`${API()}/configuracoes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` },
        body: JSON.stringify(config),
      });
      if (res.ok) showMsg("success", "Configurações salvas com sucesso!");
      else showMsg("error", "Erro ao salvar.");
    } catch { showMsg("error", "Erro de conexão."); }
    finally { setSaving(false); }
  };

  const toBase64 = (f: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader(); r.readAsDataURL(f);
    r.onload = () => res(r.result as string); r.onerror = e => rej(e);
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, field: "clinic_logo_base64" | "user_photo_base64") => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const b64 = await toBase64(f);
      setConfig(prev => ({ ...prev, [field]: b64 }));
    } catch { showMsg("error", "Falha ao ler imagem."); }
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
                      ? "bg-[var(--primary)]/10 text-[var(--primary)] shadow-[0_0_15px_rgba(20,184,166,0.1)] border border-[var(--primary)]/20"
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
                        {config.clinic_logo_base64 ? (
                          <>
                            <Image src={config.clinic_logo_base64} alt="Logo" width={96} height={96} unoptimized className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <UploadIcon size={20} className="text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="text-center group-hover:text-[var(--primary)] transition-colors">
                            <Building2 size={28} className="mx-auto mb-1 opacity-50" />
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Upload Logo</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" ref={logoRef} className="hidden" onChange={e => handleFile(e, "clinic_logo_base64")} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white mb-1">Identidade Visual da Clínica</h2>
                        <p className="text-sm text-[var(--text-muted)] max-w-md">Esta logo será utilizada nos laudos gerados (PDF e Docs) e no cabeçalho do sistema.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">Nome Fantasia</label>
                        <input type="text" value={config.clinic_name} onChange={e => setConfig({ ...config, clinic_name: e.target.value })} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_2px_rgba(20,184,166,0.1)] transition-all" placeholder="Nome da Clínica" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-label)] uppercase tracking-wider mb-2">CNPJ / Documento</label>
                        <input type="text" value={clinica?.document || ""} disabled className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-muted)] cursor-not-allowed opacity-70" />
                        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">Documento vinculado à assinatura. Contate o suporte para alterar.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[var(--card)] px-6 py-4 flex justify-end gap-3">
                    <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(20,184,166,0.25)] hover:shadow-[0_0_25px_rgba(20,184,166,0.4)] disabled:opacity-50">
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
                        {config.user_photo_base64 ? (
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
                        <input type="file" accept="image/*" ref={photoRef} className="hidden" onChange={e => handleFile(e, "user_photo_base64")} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white mb-1">Foto de Perfil</h2>
                        <p className="text-sm text-[var(--text-muted)] max-w-md">Personalize seu avatar que aparece na barra lateral e em anotações.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[var(--card)] px-6 py-4 flex justify-end gap-3">
                    <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(20,184,166,0.25)] hover:shadow-[0_0_25px_rgba(20,184,166,0.4)] disabled:opacity-50">
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
                              <div className="w-2 h-2 rounded-full bg-[var(--primary)] group-hover:shadow-[0_0_8px_rgba(20,184,166,0.6)] transition-shadow" />
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
