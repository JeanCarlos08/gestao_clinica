"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Lock, User, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

      const response = await fetch(`${API_BASE}/token`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Usuário ou senha incorretos");
      }

      const data = await response.json();
      
      // Salva o token no localStorage (Simples para o MVP)
      localStorage.setItem("token", data.access_token);
      
      // Redireciona para os atendimentos
      router.push("/atendimentos");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f0a] p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22c55e] text-black shadow-[0_8px_30px_rgb(34,197,94,0.3)]">
            <Star size={32} fill="black" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#e8f5e8]">Clínica IA</h1>
          <p className="mt-2 text-[#6b7c6b]">Gestão Clínica Inteligente e Estratégica</p>
        </div>

        {/* Card de Login */}
        <div className="rounded-[2rem] border border-[#1e2e1e] bg-[#111811] p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9ca89c]">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7c6b]" size={18} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: juliana.fetosa"
                  className="w-full rounded-xl border border-[#1e2e1e] bg-[#0a0f0a] py-3.5 pl-12 pr-4 text-[#e8f5e8] transition-all focus:border-[#22c55e] focus:outline-none focus:ring-1 focus:ring-[#22c55e]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9ca89c]">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7c6b]" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#1e2e1e] bg-[#0a0f0a] py-3.5 pl-12 pr-4 text-[#e8f5e8] transition-all focus:border-[#22c55e] focus:outline-none focus:ring-1 focus:ring-[#22c55e]"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-500 border border-red-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#22c55e] py-4 font-bold text-black transition-all hover:bg-[#16a34a] disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <a href="#" className="text-xs text-[#6b7c6b] hover:text-[#22c55e] transition-colors">
              Esqueceu sua senha?
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] text-[#6b7c6b]">
          v2.0.0 · © 2025 Clínica IA<br />
          Sistema de Gestão Restrito e Auditado
        </p>
      </div>
    </div>
  );
}
