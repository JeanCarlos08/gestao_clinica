"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, ClipboardList, BarChart2, Upload, Settings, Bot, LogOut, FileText, Users,
  Menu, X, Sparkles, ChevronDown, ChevronUp, Send,
} from "lucide-react";
import { buildDisplayName, getLoggedUserProfile, getUserInitials } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/atendimentos", label: "Atendimentos", icon: ClipboardList },
  { href: "/laudos", label: "Laudos", icon: FileText },
  { href: "/relatorios", label: "Relatórios", icon: BarChart2 },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

type Message = { role: "user" | "assistant"; text: string };

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({ displayName: "Usuário", role: "" });
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);

  // AI chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getLoggedUserProfile(token);
    setProfile({ displayName: user.displayName, role: user.role });
    (async () => {
      try {
        if (!token) return;
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/configuracoes", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const photo = data.clinica.user_photo_base64 || data.clinica.clinic_logo_base64 || null;
        if (photo) setPhotoSrc(photo);
      } catch { /* ignore */ }
    })();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [chatOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const handleAiChat = async () => {
    const q = aiQuery.trim();
    if (!q || aiLoading) return;
    setAiQuery("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
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
      setMessages((prev) => [...prev, { role: "assistant", text: data.resposta }]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: err instanceof Error ? `❌ ${err.message}` : "❌ Erro ao consultar IA" },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const navContent = (
    <>
      <div className="overflow-y-auto scrollbar-hide pb-4 flex-1 min-h-0">
        <div className="p-5 flex items-center gap-3 border-b border-[var(--border)] mb-4 bg-[linear-gradient(120deg,rgba(34,197,94,0.08),transparent_45%)]">
          <div className="text-[var(--primary)]">
            <Sparkles size={24} />
          </div>
          <span className="font-bold text-lg tracking-tight">Clínica IA</span>
        </div>

        <div className="flex items-center gap-3 px-5 mb-6">
          <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-black font-bold overflow-hidden flex-shrink-0">
            {photoSrc ? (
              <Image src={photoSrc} alt="avatar" width={40} height={40} unoptimized className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm">
                {getUserInitials(profile.displayName)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{profile.displayName}</div>
            <div className="text-xs text-[var(--primary)]">{buildDisplayName(profile.role) || "Administradora"}</div>
          </div>
        </div>

        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(href)
                  ? "text-[var(--primary)] bg-[var(--card)] border-l-4 border-[var(--primary)] font-medium"
                  : "text-[var(--text-label)] hover:text-white hover:bg-[var(--card)]"
              }`}
            >
              <Icon size={18} /> {label}
              {isActive(href) && <span className="ml-auto">›</span>}
            </Link>
          ))}
        </nav>

        {/* ─── AI Chat ─── */}
        <div className="mx-3 mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          {/* Header / toggle */}
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--primary)] hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Bot size={16} />
              IA Assistente
              {messages.length > 0 && (
                <span className="ml-1 text-[10px] bg-[var(--primary)] text-black rounded-full px-1.5 py-0.5 font-bold">
                  {messages.length}
                </span>
              )}
            </span>
            {chatOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {chatOpen && (
            <div className="flex flex-col border-t border-[var(--border)]">
              {/* Messages area */}
              <div className="flex flex-col gap-2 p-3 h-56 overflow-y-auto scrollbar-hide">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                    <Bot size={28} className="text-[var(--primary)] opacity-60" />
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Olá! Pergunte sobre pacientes,<br />atendimentos ou estatísticas.
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center mr-1.5 mt-0.5 flex-shrink-0">
                        <Bot size={11} className="text-black" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-[var(--primary)] text-black rounded-br-sm font-medium"
                          : "bg-[var(--background)] text-[var(--text-label)] border border-[var(--border)] rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {/* Typing indicator */}
                {aiLoading && (
                  <div className="flex justify-start items-end gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                      <Bot size={11} className="text-black" />
                    </div>
                    <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex items-end gap-2 p-2 border-t border-[var(--border)] bg-[var(--background)]">
                <textarea
                  ref={inputRef}
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAiChat();
                    }
                  }}
                  placeholder="Mensagem..."
                  rows={1}
                  disabled={aiLoading}
                  className="flex-1 resize-none bg-transparent text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none py-1.5 max-h-20 overflow-y-auto scrollbar-hide disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleAiChat}
                  disabled={aiLoading || !aiQuery.trim()}
                  className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-black flex-shrink-0 disabled:opacity-30 hover:opacity-90 transition-opacity"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-[var(--border)] flex-shrink-0">
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
          <LogOut size={18} /> Encerrar sessão
        </button>
        <div className="mt-4 text-[10px] text-[var(--text-muted)] px-3">
          Clínica IA v2.0<br />© 2025 - Todos os direitos reservados
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--sidebar-bg)]/95 backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-[var(--text-label)] hover:text-white hover:bg-[var(--card)] transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--primary)]" />
          <span className="font-bold text-sm">Clínica IA</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — mobile drawer / desktop fixed */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border)]
          flex flex-col justify-between flex-shrink-0
          transform transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          md:top-0 top-0
        `}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--card)]"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
        {navContent}
      </aside>
    </>
  );
}
