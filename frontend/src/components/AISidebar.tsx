"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Send, Sparkles, Trash2, ChevronRight, ChevronLeft, Zap, X } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "Resumo dos atendimentos de hoje",
  "Quantos pacientes este mês?",
  "Quais modalidades mais usadas?",
  "Atendimentos pendentes ou agendados",
];

export default function AISidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Desktop refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Mobile refs
  const mobileMessagesEndRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    mobileMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const q = (text ?? query).trim();
    if (!q || loading) return;
    setQuery("");
    [inputRef, mobileInputRef].forEach((r) => {
      if (r.current) r.current.style.height = "20px";
    });
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "/api") + "/ia/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ pergunta: q }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao consultar IA");
      setMessages((prev) => [...prev, { role: "assistant", text: data.resposta }]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: err instanceof Error ? `Erro: ${err.message}` : "Erro ao consultar IA" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Shared JSX helpers ──────────────────────────────────────────────────
  const renderMessages = (endRef: React.RefObject<HTMLDivElement>) => (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-3 min-h-0">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-5 py-6 px-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-[var(--primary)] blur-xl opacity-20" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0f3d22] to-[#020c05] border border-[rgba(74,222,128,0.15)] flex items-center justify-center shadow-[0_0_32px_rgba(34,197,94,0.12)]">
              <Bot size={28} className="text-[var(--primary)]" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white mb-1">Olá! Como posso ajudar?</p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Pergunte sobre pacientes, atendimentos,<br />estatísticas ou qualquer dado da clínica.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage(s)}
                className="group text-left text-xs px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-label)] hover:border-[rgba(34,197,94,0.25)] hover:bg-[var(--primary-dim)] hover:text-white transition-all duration-150 flex items-center gap-2"
              >
                <Zap size={11} className="text-[var(--primary)] flex-shrink-0 opacity-70 group-hover:opacity-100" />
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#16a34a] to-[#052e16] border border-[rgba(74,222,128,0.2)] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_8px_rgba(34,197,94,0.15)]">
                  <Bot size={12} className="text-[#4ade80]" />
                </div>
              )}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-[#16a34a] to-[#052e16] text-white rounded-br-sm font-medium shadow-[0_4px_12px_rgba(22,163,74,0.2)]"
                    : "bg-[var(--card)] text-[var(--text-label)] border border-[var(--border)] rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 justify-start items-end">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#16a34a] to-[#052e16] border border-[rgba(74,222,128,0.2)] flex items-center justify-center flex-shrink-0">
                <Bot size={12} className="text-[#4ade80]" />
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </>
      )}
    </div>
  );

  const renderInput = (textareaRef: React.RefObject<HTMLTextAreaElement>) => (
    <div className="flex-shrink-0 border-t border-[var(--border)] p-3">
      <div className="flex items-end gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-[rgba(34,197,94,0.35)] focus-within:shadow-[0_0_0_3px_rgba(34,197,94,0.06)] transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          placeholder="Mensagem para a IA..."
          rows={1}
          disabled={loading}
          className="flex-1 resize-none bg-transparent text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none py-0.5 max-h-24 overflow-y-auto scrollbar-hide disabled:opacity-50 leading-relaxed"
          style={{ height: "20px" }}
        />
        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={loading || !query.trim()}
          className="w-7 h-7 rounded-full bg-gradient-to-br from-[#16a34a] to-[#052e16] border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-white flex-shrink-0 disabled:opacity-30 hover:shadow-[0_0_12px_rgba(34,197,94,0.35)] transition-all mb-0.5"
        >
          <Send size={12} />
        </button>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] text-center mt-2 leading-relaxed">
        Enter para enviar &nbsp;·&nbsp; Shift+Enter nova linha
      </p>
    </div>
  );

  const panelHeader = (onClose: () => void, showClose = false) => (
    <div className="relative flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] flex-shrink-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,197,94,0.06)_0%,transparent_55%)] pointer-events-none" />
      <div className="relative flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#16a34a] to-[#052e16] border border-[rgba(74,222,128,0.2)] flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.2)]">
          <Sparkles size={13} className="text-[#4ade80]" />
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-none">IA Assistente</div>
          <div className="text-[10px] text-[var(--primary)] font-medium mt-0.5">Powered by Gemini</div>
        </div>
      </div>
      <div className="relative flex items-center gap-1">
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            title="Limpar conversa"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            title="Recolher"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── MOBILE FAB ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir IA Assistente"
        className="md:hidden fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#16a34a] to-[#052e16] border border-[rgba(74,222,128,0.3)] shadow-[0_0_28px_rgba(34,197,94,0.45),0_8px_24px_rgba(0,0,0,0.5)] flex items-center justify-center text-white active:scale-95 transition-transform"
      >
        <Sparkles size={22} />
      </button>

      {/* ── MOBILE BOTTOM SHEET ────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* panel */}
          <div
            className="relative bg-[var(--sidebar-bg)] border-t border-[var(--border)] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "85dvh", maxHeight: "85dvh" }}
          >
            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--border-light)]" />
            </div>
            {panelHeader(() => setMobileOpen(false), true)}
            {renderMessages(mobileMessagesEndRef)}
            {renderInput(mobileInputRef)}
          </div>
        </div>
      )}

      {/* ── DESKTOP: collapsed tab ──────────────────────────────── */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Abrir IA Assistente"
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center justify-center gap-1.5 bg-[var(--card)] border border-[var(--border)] border-r-0 rounded-l-2xl px-2 py-5 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-black transition-all duration-200 shadow-[var(--shadow-card)]"
        >
          <Sparkles size={16} />
          <ChevronLeft size={12} />
        </button>
      )}

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────── */}
      <aside
        className={`
          hidden md:flex flex-col flex-shrink-0
          bg-[var(--sidebar-bg)] border-l border-[var(--border)]
          transition-all duration-300 ease-out overflow-hidden
          ${collapsed ? "w-0 border-l-0" : "w-72"}
        `}
      >
        {panelHeader(() => setCollapsed(true))}
        {renderMessages(messagesEndRef)}
        {renderInput(inputRef)}
      </aside>
    </>
  );
}

