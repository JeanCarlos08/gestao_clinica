"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  acesso_negado: "Acesso negado pelo Google.",
  nao_configurado: "Login social não configurado no servidor.",
  token_invalido: "Token inválido retornado pelo Google.",
  email_nao_obtido: "Não foi possível obter seu e-mail.",
  httpx_nao_instalado: "Dependência ausente no servidor (httpx).",
  erro_interno: "Erro interno. Tente novamente.",
};

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");
    const name = params.get("name");

    if (error) {
      setStatus("error");
      setMsg(ERROR_MESSAGES[error] || "Erro desconhecido ao fazer login.");
      return;
    }

    if (!token) {
      setStatus("error");
      setMsg("Nenhum token recebido.");
      return;
    }

    localStorage.setItem("token", token);
    const refresh = params.get("refresh");
    if (refresh) localStorage.setItem("refresh_token", refresh);
    if (name) localStorage.setItem("user_name", decodeURIComponent(name));

    setStatus("success");
    setMsg(`Bem-vindo${name ? `, ${decodeURIComponent(name)}` : ""}!`);

    const t = setTimeout(() => router.replace("/atendimentos"), 1200);
    return () => clearTimeout(t);
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        {status === "loading" && (
          <>
            <Loader2 size={40} className="animate-spin text-[var(--primary)]" />
            <p className="text-white font-semibold">Autenticando…</p>
            <p className="text-sm text-[var(--text-muted)]">Aguarde um momento</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={40} className="text-[var(--primary)]" />
            <p className="text-white font-semibold">{msg}</p>
            <p className="text-sm text-[var(--text-muted)]">Redirecionando…</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle size={40} className="text-red-400" />
            <p className="text-white font-semibold">Falha no login</p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">{msg}</p>
            <button
              onClick={() => router.replace("/")}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-black font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Voltar ao login
            </button>
          </>
        )}
      </div>
    </div>
  );
}


export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <Loader2 size={40} className="animate-spin text-[var(--primary)]" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
