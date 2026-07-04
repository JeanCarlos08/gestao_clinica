"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Send, Sparkles, Trash2, ChevronRight, ChevronLeft } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "Resumo de hoje",
  "Quantos pacientes este mês?",
  "Quais modalidades mais usadas?",
  "Atendimentos pendentes",
];

export default function AISidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const q = (text ?? query).trim();
    if (!q || loading) return;
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "/api") + "/ia/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pergunta: q }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao consultar IA");
      setMessages((prev) => [...prev, { role: "assistant", text: data.resposta }]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: err instanceof Error ? `❌ ${err.message}` : "❌ Erro ao consultar IA",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <>
      {/* Collapsed toggle button */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Abrir IA Assistente"
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center gap-1 bg-[var(--card)] border border-[var(--border)] border-r-0 rounded-l-xl px-1.5 py-4 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-black transition-colors shadow-lg"
        >
          <Bot size={18} />
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Main AI panel */}
      <aside
        className={`
          hidden md:flex flex-col flex-shrink-0
          bg-[var(--sidebar-bg)] border-l border-[var(--border)]
          transition-all duration-300 ease-out overflow-hidden
          ${collapsed ? "w-0 border-l-0" : "w-72"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] bg-[linear-gradient(120deg,rgba(34,197,94,0.08),transparent_50%)] flex-shrink-0">
          <div className="flex items-center gap-2 text-[var(--primary)] font-bold text-sm">
            <Sparkles size={16} />
            IA Assistente
          </div>
          <div className="flex items-center gap-1">
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
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Recolher"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--card)] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-3 flex flex-col gap-3 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center">
                <Bot size={28} className="text-[var(--primary)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white mb-1">IA Assistente</p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Pergunte sobre seus dados,<br />pacientes e atendimentos.
                </p>
              </div>
              {/* Quick suggestions */}
              <div className="flex flex-col gap-2 w-full mt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="text-left text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-label)] hover:border-[var(--primary)] hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={13} className="text-black" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[var(--primary)] text-black rounded-br-sm font-medium"
                        : "bg-[var(--card)] text-[var(--text-label)] border border-[var(--border)] rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-2 justify-start items-end">
                  <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                    <Bot size={13} className="text-black" />
                  </div>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-[var(--border)] p-3 bg-[var(--sidebar-bg)]">
          <div className="flex items-end gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-2 focus-within:border-[var(--primary)] transition-colors">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // auto-resize
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
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
              className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-black flex-shrink-0 disabled:opacity-30 hover:opacity-90 transition-opacity mb-0.5"
            >
              <Send size={13} />
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">
            Enter para enviar · Shift+Enter para quebrar linha
          </p>
        </div>
      </aside>
    </>
  );
}
