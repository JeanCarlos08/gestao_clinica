"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Bot, Send, X, Loader2, MessageCircle } from "lucide-react";
import AiMarkdown from "@/components/AiMarkdown";

interface Msg { role: "user" | "assistant"; text: string }

export default function AiChatPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  /* Login é tela cheia — sem chrome do app */
  if (pathname === "/") return null;

  const send = async (text?: string) => {
    const q = (text ?? query).trim();
    if (!q || loading) return;
    setQuery("");
    setMessages((p) => [...p, { role: "user", text: q }]);
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pergunta: q, historico: messages.map(m => ({ role: m.role, text: m.text })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao consultar IA");
      const resposta: string = data.resposta ?? "";
      setMessages((p) => [...p, { role: "assistant", text: "" }]);
      const step = Math.max(4, Math.ceil(resposta.length / 70));
      let i = 0;
      const int = setInterval(() => {
        i = Math.min(i + step, resposta.length);
        setMessages((p) => {
          const last = p[p.length - 1];
          if (!last || last.role !== "assistant") { clearInterval(int); return p; }
          const cp = [...p];
          cp[cp.length - 1] = { role: "assistant", text: resposta.slice(0, i) };
          return cp;
        });
        if (i >= resposta.length) clearInterval(int);
      }, 14);
    } catch (err) {
      setMessages((p) => [...p, { role: "assistant", text: `Erro: ${err instanceof Error ? err.message : "falha ao consultar a IA"}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fechar assistente IA" : "Abrir assistente IA"}
        className="fixed bottom-5 right-5 z-[90] w-14 h-14 rounded-full bg-[linear-gradient(135deg,#4DA768,#1E7A46)] text-[#052417] flex items-center justify-center shadow-[0_6px_28px_rgba(77,167,104,0.45)] hover:shadow-[0_6px_36px_rgba(77,167,104,0.65)] hover:scale-105 active:scale-95 transition-all duration-200"
      >
        {open ? <X size={22} strokeWidth={2.5} /> : <MessageCircle size={22} strokeWidth={2.5} />}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#4ade80] border-2 border-[#0a1f14] pulse-green" />
        )}
      </button>

      {/* Popup */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[90] w-[min(400px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-7rem))] flex flex-col rounded-2xl border border-[rgba(142,227,154,0.25)] bg-[#0a1810]/95 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden animate-[popupIn_0.25s_ease]">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(142,227,154,0.18)] bg-[linear-gradient(135deg,rgba(77,167,104,0.22),transparent)] flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,#4DA768,#8ee39a)] flex items-center justify-center shadow-[0_0_16px_rgba(77,167,104,0.4)] flex-shrink-0">
              <Bot size={17} className="text-[#052417]" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-white leading-none">IA Assistente</div>
              <div className="text-[10px] text-[#a8e8b7] mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] pulse-green" />
                Gemini · dados da clínica
              </div>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                aria-label="Limpar conversa"
                className="w-7 h-7 rounded-lg bg-white/[0.07] border border-white/10 flex items-center justify-center text-[#a8e8b7] hover:text-white hover:bg-white/[0.14] transition-colors flex-shrink-0"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Quick chips */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1 flex-shrink-0">
              {[
                { label: "Resumo do dia", q: "Resumo dos atendimentos de hoje" },
                { label: "Aguardando hoje", q: "Quais pacientes estão agendados para hoje e aguardam atendimento?" },
                { label: "Semana cheia?", q: "Qual o dia da semana com mais atendimentos?" },
                { label: "Ausências", q: "Quantos pacientes faltaram e cancelaram no total?" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => send(chip.q)}
                  className="text-[11px] font-bold text-[#d7ece0] bg-white/[0.07] hover:bg-[rgba(142,227,154,0.16)] border border-[rgba(142,227,154,0.22)] hover:border-[rgba(142,227,154,0.45)] rounded-full px-3 py-1.5 transition-all duration-200 hover:-translate-y-px btn-motion"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div ref={listRef} className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`msg-in rounded-xl px-3 py-2 break-words ${
                  m.role === "user"
                    ? "self-end max-w-[88%] text-[13px] leading-snug whitespace-pre-wrap bg-[rgba(77,167,104,0.32)] text-white border border-[rgba(142,227,154,0.4)]"
                    : "self-start max-w-[96%] bg-[rgba(8,18,13,0.7)] text-[#d7ece0] border border-[rgba(255,255,255,0.1)] text-[13px]"
                }`}
              >
                {m.role === "user" ? m.text : <AiMarkdown text={m.text} />}
              </div>
            ))}
            {loading && (
              <div className="msg-in self-start flex items-center gap-1.5 text-[#a8e8b7] bg-[rgba(8,18,13,0.7)] border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2.5">
                <span className="typing-dots"><i /><i /><i /></span>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 px-4 py-3 border-t border-[rgba(142,227,154,0.18)] bg-[rgba(0,0,0,0.25)] flex-shrink-0"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pergunte à IA…"
              aria-label="Perguntar à IA"
              className="flex-1 min-w-0 text-[13px] text-white placeholder:text-[rgba(255,255,255,0.4)] bg-[rgba(8,18,13,0.6)] border border-[rgba(255,255,255,0.14)] rounded-xl px-3.5 py-2.5 outline-none focus:border-[rgba(142,227,154,0.6)] focus:shadow-[0_0_0_3px_rgba(77,167,104,0.16)] transition-all"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              aria-label="Enviar para a IA"
              className="w-10 h-10 rounded-xl bg-[linear-gradient(135deg,#4DA768,#1E7A46)] text-[#052417] flex items-center justify-center flex-shrink-0 disabled:opacity-35 hover:shadow-[0_0_14px_rgba(77,167,104,0.5)] transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.5} />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
