"use client";

import { memo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, ClipboardList, BarChart2, Upload, Settings, LogOut, FileText, Users,
  Menu, X, Sparkles, ChevronRight, FileEdit, Bot, Send, Camera, Loader2, Sun, Moon,
} from "lucide-react";
import { buildDisplayName, getLoggedUserProfile, getUserInitials } from "@/lib/auth";
import AiMarkdown from "@/components/AiMarkdown";
import { useTheme } from "@/components/ThemeProvider";
import { useClinicaMarca } from "@/hooks/useClinicaMarca";

const Clock = memo(function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-[11px] font-semibold text-[#a8e8b7]">{time}</span>;
});

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",    icon: Home,          color: "text-emerald-400" },
  { href: "/pacientes",     label: "Pacientes",    icon: Users,         color: "text-blue-400" },
  { href: "/atendimentos",  label: "Atendimentos", icon: ClipboardList, color: "text-violet-400" },
  { href: "/laudos",        label: "Laudos",       icon: FileText,      color: "text-amber-400" },
  { href: "/documentos",    label: "Documento",    icon: FileEdit,      color: "text-emerald-400" },
  { href: "/relatorios",    label: "Relatórios",   icon: BarChart2,     color: "text-cyan-400" },
  { href: "/upload",        label: "Upload",       icon: Upload,        color: "text-pink-400" },
  { href: "/configuracoes", label: "Configurações",icon: Settings,      color: "text-slate-400" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const { clinicName, clinicLogo } = useClinicaMarca();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({ displayName: "Usuário", role: "" });
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const aiListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aiListRef.current) aiListRef.current.scrollTop = aiListRef.current.scrollHeight;
  }, [aiMessages, aiLoading]);

  useEffect(() => {
    if (clinicLogo) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = clinicLogo;
    }
  }, [clinicLogo]);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getLoggedUserProfile(token);
    setProfile({ displayName: user.displayName, role: user.role });

    // Tenta carregar foto do cache local primeiro (evita request a cada navegação)
    const cached = localStorage.getItem("sidebar_photo_cache");
    const cachedTime = localStorage.getItem("sidebar_photo_time");
    const now = Date.now();
    if (cached && cachedTime && now - parseInt(cachedTime) < 300000) {
      setPhotoSrc(cached);
      return;
    }

    (async () => {
      try {
        if (!token) return;
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/configuracoes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const photo = data.clinica.user_photo_base64 || data.clinica.clinic_logo_base64 || null;
        if (photo) {
          setPhotoSrc(photo);
          localStorage.setItem("sidebar_photo_cache", photo);
          localStorage.setItem("sidebar_photo_time", now.toString());
        }
      } catch (e) { console.debug("Erro ao carregar foto do sidebar:", e); }
    })();
  }, []);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  /* Mini-chat da IA: envia /api/ia/chat e exibe a conversa no próprio card */
  const sendAI = async (text?: string) => {
    const q = (text ?? aiQuery).trim();
    if (!q || aiLoading) return;
    setAiQuery("");
    setAiMessages((prev) => [...prev, { role: "user", text: q }]);
    setAiLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pergunta: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao consultar IA");
      setAiMessages((prev) => [...prev, { role: "assistant", text: data.resposta }]);
    } catch (err: unknown) {
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Erro: ${err instanceof Error ? err.message : "falha ao consultar a IA"}` },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const navContent = (
    <>
      <div className="overflow-y-auto scrollbar-hide pb-4 flex-1 min-h-0">

        {/* Brand header */}
        <div className="relative px-5 py-5 border-b border-[var(--border)] mb-3 overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[var(--primary)] opacity-[0.07] blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(77,167,104,0.08)] to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4DA768] to-[#0d3a22] border border-[rgba(168,232,183,0.3)] flex items-center justify-center shadow-[0_0_24px_rgba(77,167,104,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] flex-shrink-0 overflow-hidden">
              {clinicLogo
                ? <Image src={clinicLogo} alt="Logo da clínica" width={40} height={40} unoptimized className="w-full h-full object-cover" />
                : <Sparkles size={17} className="text-[#eafff1]" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-sm text-white tracking-tight leading-tight truncate">{clinicName}</div>
              <div className="text-[10px] text-[#9cbbaa] tracking-wide">Prontuário • Agenda</div>
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(123,207,138,0.35)] bg-[rgba(77,167,104,0.16)] px-2 py-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] pulse-green" />
                <span className="text-[9px] font-extrabold uppercase tracking-[1.2px] text-[#c8f5d0]">Online</span>
                <span className="text-[9px] font-semibold text-[#8fd3a1]">· <Clock /></span>
              </div>
            </div>
          </div>
        </div>

        {/* User profile */}
        <div className="mx-3 mb-4 p-3 rounded-2xl bg-[linear-gradient(160deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] border border-[rgba(255,255,255,0.16)] backdrop-blur-md flex items-center gap-3 group hover:border-[rgba(123,207,138,0.4)] hover:-translate-y-0.5 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_26px_rgba(0,0,0,0.3)]">
          <Link
            href="/configuracoes"
            title="Trocar foto"
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0 border-2 border-[rgba(168,232,183,0.3)] shadow-[0_0_18px_rgba(77,167,104,0.3)] relative"
          >
            {photoSrc ? (
              <Image src={photoSrc} alt="avatar" width={44} height={44} unoptimized className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#4DA768] to-[#0d3a22] flex items-center justify-center">
                <span className="text-xs font-bold">{getUserInitials(profile.displayName)}</span>
              </div>
            )}
            {/* Presença */}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#4ade80] border-2 border-[#051b11] pulse-green" />
            {/* Trocar foto no hover */}
            <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </span>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate leading-tight">{profile.displayName}</div>
            <div className="text-[11px] text-[#a8e8b7] font-medium truncate">
              {buildDisplayName(profile.role) || "Administradora"}
            </div>
          </div>
          <ChevronRight size={14} className="text-[rgba(255,255,255,0.4)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>

        {/* Nav label */}
        <div className="px-5 mb-2">
          <span className="text-[9px] font-bold text-[#9cbbaa] uppercase tracking-[2px]">Navegação</span>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, color }, i) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                style={{ animationDelay: `${i * 45}ms` }}
                className={`list-item-fade group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${
                  active
                    ? "bg-[linear-gradient(135deg,rgba(142,227,154,0.26),rgba(255,255,255,0.08))] text-white border border-[rgba(168,235,177,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_22px_rgba(0,0,0,0.22)] translate-x-[3px] font-bold"
                    : "text-[#9cbbaa] border border-transparent hover:text-white hover:bg-white/[0.07] hover:translate-x-[3px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_6px_18px_rgba(0,0,0,0.2)]"
                }`}
              >
                {/* Active left accent */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[linear-gradient(180deg,#b7f0c0,#4DA768)] shadow-[0_0_10px_rgba(142,227,154,0.75)]" />
                )}

                <span className={`flex-shrink-0 transition-all duration-200 ${active ? color : "text-[var(--text-muted)] group-hover:text-white"}`}>
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className="flex-1 truncate">{label}</span>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.9)] flex-shrink-0 pulse-green" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Card IA */}
        <div className="mx-3 mt-4 p-3 rounded-2xl bg-[linear-gradient(160deg,rgba(77,167,104,0.28),rgba(0,0,0,0.22))] border border-[rgba(142,227,154,0.28)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_26px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-[10px] bg-[linear-gradient(135deg,#4DA768,#8ee39a)] flex items-center justify-center shadow-[0_0_14px_rgba(77,167,104,0.4)] flex-shrink-0">
              <Bot size={14} className="text-[#052417]" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white leading-none">IA Assistente</div>
              <div className="text-[9px] text-[#a8e8b7] mt-0.5">Gemini · dados da clínica</div>
            </div>
            {aiMessages.length > 0 ? (
              <button
                type="button"
                onClick={() => setAiMessages([])}
                aria-label="Limpar conversa da IA"
                className="ml-auto w-5 h-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#a8e8b7] hover:text-white hover:bg-white/20 flex-shrink-0 transition-colors"
              >
                <X size={10} strokeWidth={3} />
              </button>
            ) : (
              <span className="ml-auto text-[8px] font-black uppercase tracking-[1px] text-[#c8f5d0] bg-white/10 border border-white/10 rounded-full px-1.5 py-[3px] flex-shrink-0">
                Beta
              </span>
            )}
          </div>
          {aiMessages.length > 0 && (
            <div
              ref={aiListRef}
              className="flex flex-col gap-1.5 mb-2 max-h-44 overflow-y-auto scrollbar-hide"
            >
              {aiMessages.map((m, i) => (
                <div
                  key={i}
                  className={`msg-in rounded-lg px-2 py-1.5 break-words ${
                    m.role === "user"
                      ? "self-end max-w-[92%] text-[11px] leading-snug whitespace-pre-wrap bg-[rgba(77,167,104,0.32)] text-white border border-[rgba(142,227,154,0.4)]"
                      : "self-start max-w-[100%] min-w-[70%] bg-[rgba(8,18,13,0.7)] text-[#d7ece0] border border-[rgba(255,255,255,0.1)]"
                  }`}
                >
                  {m.role === "user" ? m.text : <AiMarkdown text={m.text} />}
                </div>
              ))}
              {aiLoading && (
                <div className="msg-in self-start flex items-center gap-1.5 text-[#a8e8b7] bg-[rgba(8,18,13,0.7)] border border-[rgba(255,255,255,0.1)] rounded-lg px-2.5 py-2">
                  <span className="typing-dots"><i/><i/><i/></span>
                </div>
              )}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); sendAI(); }}
            className="flex items-center gap-1.5"
          >
            <input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder={aiMessages.length ? "Pergunte à IA…" : "Ex: resumo de hoje"}
              aria-label="Perguntar à IA"
              className="flex-1 min-w-0 text-xs text-white placeholder:text-[rgba(255,255,255,0.4)] bg-[rgba(8,18,13,0.6)] border border-[rgba(255,255,255,0.14)] rounded-lg px-2.5 py-2 outline-none focus:border-[rgba(142,227,154,0.6)] focus:shadow-[0_0_0_3px_rgba(77,167,104,0.16)] transition-all"
            />
            <button
              type="submit"
              disabled={!aiQuery.trim() || aiLoading}
              aria-label="Enviar para a IA"
              className="w-7 h-7 rounded-lg bg-[linear-gradient(135deg,#4DA768,#1E7A46)] text-[#052417] flex items-center justify-center flex-shrink-0 disabled:opacity-35 hover:shadow-[0_0_12px_rgba(77,167,104,0.5)] transition-all"
            >
              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} strokeWidth={2.5} />}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.09)] p-3 space-y-1 bg-[rgba(0,0,0,0.18)] backdrop-blur-sm">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Alterna tema claro/escuro"
          className="theme-btn"
        >
          {theme === "dark" ? <Sun size={12} /> : <Moon size={13} />}
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="btn-motion flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-[#9cbbaa] hover:text-[#ffd0d6] hover:bg-[rgba(255,80,80,0.16)] border border-transparent hover:border-[rgba(255,80,80,0.28)] rounded-xl transition-all duration-200 group"
        >
          <LogOut size={15} strokeWidth={2} className="group-hover:rotate-12 group-hover:text-[#ff8f9b] transition-transform duration-200" />
          Encerrar sessão
        </button>
        <div className="px-3 pt-1 text-center">
          <span className="text-[9px] text-[#6f917c] whitespace-nowrap">v3.0 · {clinicName}</span>
        </div>
        <div className="px-3 flex items-center justify-center gap-2">
          <Link href="/privacy" className="text-[9px] text-[#6f917c] hover:text-[#a8e8b7] transition-colors">Privacidade</Link>
          <span className="text-[9px] text-[#3f5c4b]">·</span>
          <Link href="/terms" className="text-[9px] text-[#6f917c] hover:text-[#a8e8b7] transition-colors">Termos</Link>
        </div>
        <div className="px-3 pb-0.5 text-center">
          <span className="text-[9px] text-[#3f5c4b]">🔒 LGPD · © 2026</span>
        </div>
      </div>
    </>
  );

  /* Login é tela cheia — sem chrome do app */
  if (pathname === "/") return null;

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--sidebar-bg)]/95 backdrop-blur-xl border-b border-[var(--border)] flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl text-[var(--text-label)] hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1E7A46] to-[#0d3a22] flex items-center justify-center">
            <Sparkles size={12} className="text-[#7BCF8A]" />
          </div>
          <span className="font-bold text-sm tracking-tight gradient-text truncate max-w-[140px]">{clinicName}</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-60 flex-shrink-0 flex flex-col relative overflow-hidden
          sidebar-premium border-r border-[var(--border)]
          transform transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="md:hidden absolute top-3 right-3 p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] z-10"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
        {navContent}
      </aside>
    </>
  );
}
