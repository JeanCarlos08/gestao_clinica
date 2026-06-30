"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Settings, User, Building2, Phone, Mail, MapPin,
  Link, Save, Loader2, CheckCircle2, AlertCircle,
  Shield, Clock, Activity
} from "lucide-react";

interface Config {
  clinica: Record<string, string>;
  usuario: {
    id: number | null;
    username: string;
    display_name: string;
    email: string;
    role: string;
    created_at: string | null;
    last_login: string | null;
  };
}

interface AuditoriaEntry {
  id: number;
  acao: string;
  entidade: string;
  entidade_id: number | null;
  detalhes: string | null;
  usuario: string | null;
  criado_em: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador", psicologo: "Psicólogo", recepcionista: "Recepcionista"
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Config | null>(null);
  const [auditoria, setAuditoria] = useState<AuditoriaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"clinica"|"perfil"|"auditoria">("clinica");
  const [msg, setMsg] = useState<{type:"success"|"error"; text:string}|null>(null);

  // Form fields
  const [clinicName, setClinicName] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicGoogleDoc, setClinicGoogleDoc] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const getToken = () => localStorage.getItem("token");
  const API = () => process.env.NEXT_PUBLIC_API_URL || "/api";

  const showMsg = (type: "success"|"error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    const fetchAll = async () => {
      const token = getToken();
      if (!token) { router.push("/"); return; }
      setLoading(true);
      try {
        const [cfgRes, audRes] = await Promise.all([
          fetch(`${API()}/configuracoes`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API()}/auditoria?limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (cfgRes.status === 401) { localStorage.removeItem("token"); router.push("/"); return; }
        const cfgData: Config = await cfgRes.json();
        setConfig(cfgData);
        // Populate form
        const c = cfgData.clinica;
        setClinicName(c.clinic_name || "");
        setClinicPhone(c.clinic_phone || "");
        setClinicEmail(c.clinic_email || "");
        setClinicAddress(c.clinic_address || "");
        setClinicGoogleDoc(c.clinic_google_doc_id || "");
        setDisplayName(cfgData.usuario.display_name || "");
        setUserEmail(cfgData.usuario.email || "");
        if (audRes.ok) setAuditoria(await audRes.json());
      } catch { showMsg("error", "Erro ao carregar configurações."); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [router]);

  const saveClinica = async () => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API()}/configuracoes`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_name: clinicName || null,
          clinic_phone: clinicPhone || null,
          clinic_email: clinicEmail || null,
          clinic_address: clinicAddress || null,
          clinic_google_doc_id: clinicGoogleDoc || null,
          user_display_name: displayName || null,
          user_email: userEmail || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); showMsg("error", e.detail || "Erro ao salvar."); }
      else showMsg("success", "Configurações salvas com sucesso!");
    } catch { showMsg("error", "Falha ao salvar configurações."); }
    finally { setSaving(false); }
  };

  const uploadImage = async (field: "user_photo"|"clinic_logo", file?: File|null) => {
    const token = getToken();
    if (!token || !file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("field", field);
      fd.append("file", file);
      const res = await fetch(`${API()}/configuracoes/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) { const e = await res.json(); showMsg("error", e.detail || "Falha ao enviar imagem."); }
      else {
        showMsg("success", "Imagem enviada com sucesso.");
        // refresh config
        const cfgRes = await fetch(`${API()}/configuracoes`, { headers: { Authorization: `Bearer ${token}` } });
        if (cfgRes.ok) setConfig(await cfgRes.json());
      }
    } catch { showMsg("error", "Erro ao enviar imagem."); }
    finally { setSaving(false); }
  };

  const ACAO_COLOR: Record<string, string> = {
    criar: "#22c55e", criar_atendimento: "#22c55e",
    atualizar: "#3b82f6", atualizar_status: "#3b82f6",
    excluir: "#ef4444", deletar: "#ef4444",
    anexar: "#a855f7", desanexar: "#f97316",
  };
  const getAcaoColor = (acao: string) =>
    ACAO_COLOR[acao.toLowerCase()] || ACAO_COLOR[Object.keys(ACAO_COLOR).find(k => acao.toLowerCase().includes(k)) || ""] || "#f59e0b";

  const tabs = [
    { id: "clinica" as const, label: "🏥 Clínica", icon: Building2 },
    { id: "perfil" as const, label: "👤 Perfil", icon: User },
    { id: "auditoria" as const, label: "📋 Auditoria", icon: Activity },
  ];

  const inputClass = "w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[var(--primary)] transition-colors";
  const labelClass = "block text-[11px] text-[var(--text-label)] font-semibold uppercase tracking-wider mb-1.5";

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 scrollbar-hide">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-[var(--primary)]/10 text-[var(--primary)] p-2 rounded-lg"><Settings size={24}/></div>
            <h1 className="text-2xl font-bold">Configurações</h1>
          </div>
          <p className="text-[var(--text-muted)] text-sm">Gerencie os dados da clínica, perfil e auditoria</p>
        </div>
        {activeTab !== "auditoria" && (
          <button onClick={saveClinica} disabled={saving||loading}
            className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:opacity-50">
            {saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>}
            {saving?"Salvando...":"Salvar"}
          </button>
        )}
      </div>

      {/* Toast */}
      {msg && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 text-sm ${
          msg.type==="success"?"bg-green-500/10 border-green-500/30 text-green-400":"bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {msg.type==="success"?<CheckCircle2 size={18}/>:<AlertCircle size={18}/>} {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 fade-up">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab===t.id?"bg-[var(--primary)] text-black":"bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
          <Loader2 size={32} className="animate-spin mr-3"/> Carregando configurações...
        </div>
      ) : (
        <>
          {/* Aba Clínica */}
          {activeTab==="clinica" && (
            <div className="space-y-6">
              {/* Info card do usuário logado */}
              {config && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[var(--primary)] text-xl font-bold">
                      {(config.usuario.display_name || config.usuario.username || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-white">{config.usuario.display_name || config.usuario.username}</div>
                    <div className="text-xs text-[var(--primary)]">{ROLE_LABELS[config.usuario.role]||config.usuario.role}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">Último login: {formatDate(config.usuario.last_login)}</div>
                  </div>
                  <div className="ml-auto text-right text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-1 justify-end"><Shield size={12}/> ID #{config.usuario.id}</div>
                    <div className="mt-1 flex items-center gap-1 justify-end"><Clock size={12}/> Cadastro: {formatDate(config.usuario.created_at)}</div>
                  </div>
                </div>
              )}

              <div className="premium-surface rounded-xl p-6 fade-up">
                <div className="flex items-center gap-2 font-semibold mb-6"><Building2 size={18} className="text-[var(--primary)]"/> Dados da Clínica</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Logotipo da clínica</label>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-12 rounded overflow-hidden bg-[var(--card)] border border-[var(--border)] flex items-center justify-center relative">
                        {config?.clinica?.clinic_logo_base64 ? (
                          <Image
                            src={config.clinica.clinic_logo_base64}
                            alt="Logo"
                            fill
                            unoptimized
                            sizes="80px"
                            className="object-contain"
                          />
                        ) : (
                          <div className="text-xs text-[var(--text-muted)]">Sem logo</div>
                        )}
                      </div>
                      <div>
                        <input type="file" accept="image/*" id="clinic_logo_input" onChange={e=>uploadImage("clinic_logo", e.target.files?.[0]||null)} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}><Building2 size={11} className="inline mr-1"/>Nome da Clínica</label>
                    <input className={inputClass} value={clinicName} onChange={e=>setClinicName(e.target.value)} placeholder="Ex: Clínica Saúde Mental"/>
                  </div>
                  <div>
                    <label className={labelClass}><Phone size={11} className="inline mr-1"/>Telefone</label>
                    <input className={inputClass} value={clinicPhone} onChange={e=>setClinicPhone(e.target.value)} placeholder="(11) 9 9999-9999"/>
                  </div>
                  <div>
                    <label className={labelClass}><Mail size={11} className="inline mr-1"/>E-mail da Clínica</label>
                    <input className={inputClass} type="email" value={clinicEmail} onChange={e=>setClinicEmail(e.target.value)} placeholder="contato@clinica.com"/>
                  </div>
                  <div>
                    <label className={labelClass}><MapPin size={11} className="inline mr-1"/>Endereço</label>
                    <input className={inputClass} value={clinicAddress} onChange={e=>setClinicAddress(e.target.value)} placeholder="Rua, Número, Cidade"/>
                  </div>
                </div>
              </div>

              <div className="premium-surface rounded-xl p-6 fade-up">
                <div className="flex items-center gap-2 font-semibold mb-6"><Link size={18} className="text-[var(--primary)]"/> Integrações</div>
                <div className="space-y-5">
                  <div>
                    <label className={labelClass}><Link size={11} className="inline mr-1"/>Google Doc ID (Template)</label>
                    <input className={inputClass} value={clinicGoogleDoc} onChange={e=>setClinicGoogleDoc(e.target.value)} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"/>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">ID do documento Google Docs usado como template de laudos.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba Perfil */}
          {activeTab==="perfil" && config && (
            <div className="space-y-6">
              <div className="premium-surface rounded-xl p-6 fade-up">
                <div className="flex items-center gap-2 font-semibold mb-6"><User size={18} className="text-[var(--primary)]"/> Informações do Perfil</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Foto do Usuário</label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--card)] relative">
                        {config.clinica.user_photo_base64 ? (
                          <Image
                            src={config.clinica.user_photo_base64}
                            alt="Foto"
                            fill
                            unoptimized
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-[var(--text-muted)]">{(config.usuario.display_name||config.usuario.username||"?")[0]}</div>
                        )}
                      </div>
                      <div>
                        <input type="file" accept="image/*" id="user_photo_input" onChange={e=>uploadImage("user_photo", e.target.files?.[0]||null)} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Username</label>
                    <input className={`${inputClass} opacity-50 cursor-not-allowed`} value={config.usuario.username} disabled/>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Username não pode ser alterado por aqui.</p>
                  </div>
                  <div>
                    <label className={labelClass}>Role / Perfil</label>
                    <input className={`${inputClass} opacity-50 cursor-not-allowed`} value={ROLE_LABELS[config.usuario.role]||config.usuario.role} disabled/>
                  </div>
                  <div>
                    <label className={labelClass}><User size={11} className="inline mr-1"/>Nome de Exibição</label>
                    <input className={inputClass} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Seu nome completo"/>
                  </div>
                  <div>
                    <label className={labelClass}><Mail size={11} className="inline mr-1"/>E-mail do Usuário</label>
                    <input className={inputClass} type="email" value={userEmail} onChange={e=>setUserEmail(e.target.value)} placeholder="voce@email.com"/>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
                <div className="flex items-center gap-2 font-semibold mb-4"><Shield size={18} className="text-[var(--primary)]"/> Sessão Atual</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-[var(--background)] rounded-lg p-4">
                    <div className="text-[var(--text-muted)] text-xs mb-1">Conta criada em</div>
                    <div className="text-white font-medium">{formatDate(config.usuario.created_at)}</div>
                  </div>
                  <div className="bg-[var(--background)] rounded-lg p-4">
                    <div className="text-[var(--text-muted)] text-xs mb-1">Último acesso</div>
                    <div className="text-white font-medium">{formatDate(config.usuario.last_login)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba Auditoria */}
          {activeTab==="auditoria" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[var(--border)] flex items-center gap-2 font-semibold">
                <Activity size={18} className="text-[var(--primary)]"/>
                Log de Auditoria ({auditoria.length} registros)
              </div>
              {auditoria.length===0?(
                <div className="p-16 text-center text-[var(--text-muted)]">Nenhum registro de auditoria.</div>
              ):(
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--text-label)] tracking-wider">
                        {["#","Ação","Entidade","ID","Detalhes","Usuário","Data/Hora"].map(h=>(
                          <th key={h} className="p-4 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {auditoria.map((e,i)=>(
                        <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors">
                          <td className="p-4 text-xs text-[var(--text-muted)]">{i+1}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                              style={{background:`${getAcaoColor(e.acao)}20`, color:getAcaoColor(e.acao)}}>
                              {e.acao}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-white font-mono">{e.entidade}</td>
                          <td className="p-4 text-xs text-[var(--text-muted)]">{e.entidade_id ?? "—"}</td>
                          <td className="p-4 text-xs text-[var(--text-muted)] max-w-[240px] truncate" title={e.detalhes||""}>{e.detalhes||"—"}</td>
                          <td className="p-4 text-xs text-[var(--text-muted)]">{e.usuario||"system"}</td>
                          <td className="p-4 text-xs text-[var(--text-muted)] whitespace-nowrap">{formatDate(e.criado_em)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
