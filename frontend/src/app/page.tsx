"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
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
        setAttempts((prev) => Math.min(prev + 1, 5));
        throw new Error("Usuário ou senha incorretos");
      }

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      router.push("/atendimentos");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
          background: #1a5c35;
        }

        /* Fundo: foto da sala + blur + overlay verde */
        .lp-bg {
          position: fixed;
          inset: 0;
          background-image: url('/room-bg.png');
          background-size: cover;
          background-position: center;
          filter: blur(8px) brightness(0.55) saturate(1.2);
          transform: scale(1.08);
          z-index: 0;
        }
        .lp-bg-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 70, 35, 0.62);
          z-index: 1;
        }

        /* Card externo (moldura verde arredondada) */
        .lp-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 360px;
          border-radius: 28px;
          overflow: hidden;
          box-shadow:
            0 32px 80px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(255,255,255,0.10) inset;
          background: linear-gradient(170deg, #1e7040 0%, #155230 45%, #0f3d22 100%);
          animation: slideUp 0.45s cubic-bezier(0.16,1,0.3,1) both;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Barra superior: Compartilhar */
        .lp-topbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 14px 18px 0;
        }
        .lp-share {
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.72);
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color 0.2s;
          padding: 4px 0;
        }
        .lp-share:hover { color: #fff; }

        /* Seção cabeçalho: avatar + título */
        .lp-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          padding: 10px 24px 22px;
          text-align: center;
        }
        .lp-avatar-ring {
          width: 88px;
          height: 88px;
          border-radius: 18px;
          overflow: hidden;
          border: 3px solid rgba(255,255,255,0.28);
          box-shadow:
            0 8px 24px rgba(0,0,0,0.40),
            0 0 0 1px rgba(255,255,255,0.06) inset;
          flex-shrink: 0;
          margin-bottom: 14px;
        }
        .lp-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }
        .lp-title {
          font-size: 27px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.6px;
          line-height: 1.15;
          text-shadow: 0 2px 12px rgba(0,0,0,0.35);
          margin-bottom: 5px;
        }
        .lp-subtitle {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 3px;
          color: rgba(255,255,255,0.58);
          text-transform: uppercase;
        }

        /* Card branco do formulário */
        .lp-form-card {
          margin: 0 13px;
          background: #ffffff;
          border-radius: 20px;
          padding: 22px 20px 24px;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.22),
            0 1px 0 rgba(255,255,255,0.8) inset;
        }

        .lp-form-title {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          color: #1a6635;
          margin-bottom: 18px;
          letter-spacing: -0.2px;
        }

        .lp-form { display: flex; flex-direction: column; gap: 13px; }

        /* Grupo de campo */
        .lp-field { display: flex; flex-direction: column; gap: 5px; }
        .lp-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          font-weight: 600;
          color: #1a6635;
        }
        .lp-label-icon { font-size: 14px; line-height: 1; }

        .lp-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #ddeee3;
          border-radius: 10px;
          font-size: 13.5px;
          color: #222;
          background: #f7fdf9;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
          font-family: inherit;
        }
        .lp-input:focus {
          border-color: #1a6635;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(26,102,53,0.13);
        }
        .lp-input::placeholder { color: #b0c8b8; font-size: 13px; }

        /* Campo de senha */
        .lp-pw-wrap { position: relative; }
        .lp-pw-input { padding-right: 48px; }
        .lp-eye {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #1a6635;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: background 0.18s;
          flex-shrink: 0;
        }
        .lp-eye:hover { background: #145228; }

        /* Erro */
        .lp-error {
          background: #fff2f2;
          border: 1px solid #fcc;
          color: #c0392b;
          font-size: 12px;
          text-align: center;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 500;
        }

        /* Botão entrar */
        .lp-submit {
          width: 100%;
          background: linear-gradient(160deg, #1a6635 0%, #114d26 100%);
          color: #fff;
          border: none;
          border-radius: 13px;
          padding: 15px 20px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          transition: transform 0.15s, box-shadow 0.15s, background 0.2s;
          box-shadow: 0 4px 18px rgba(26,102,53,0.42);
          font-family: inherit;
          margin-top: 2px;
          position: relative;
        }
        .lp-submit:hover:not(:disabled) {
          background: linear-gradient(160deg, #145228 0%, #0e3d1e 100%);
          transform: translateY(-2px);
          box-shadow: 0 7px 22px rgba(26,102,53,0.52);
        }
        .lp-submit:active:not(:disabled) { transform: translateY(0); }
        .lp-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        .lp-btn-main {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.2;
          text-align: center;
          letter-spacing: 0.1px;
        }
        .lp-btn-arrow {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          transition: transform 0.18s;
        }
        .lp-submit:hover:not(:disabled) .lp-btn-arrow {
          transform: translateY(-50%) translateX(3px);
        }

        /* Rodapé do card principal */
        .lp-footer {
          text-align: center;
          padding: 15px 0 18px;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.68);
          letter-spacing: 0.2px;
        }

        /* Spinner */
        .lp-spin { animation: spin 0.85s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 400px) {
          .lp-card { border-radius: 22px; }
          .lp-title { font-size: 24px; }
          .lp-form-card { margin: 0 10px; padding: 18px 16px 20px; }
        }
      `}</style>

      <div className="lp-root">
        {/* Fundo foto + overlay verde */}
        <div className="lp-bg" />
        <div className="lp-bg-overlay" />

        {/* Card principal */}
        <div className="lp-card">

          {/* Barra superior */}
          <div className="lp-topbar">
            <button className="lp-share" type="button">
              Compartilhar&nbsp;☆
            </button>
          </div>

          {/* Avatar + títulos */}
          <div className="lp-header">
            <div className="lp-avatar-ring">
              <Image
                src="/avatar.png"
                alt="Gestão Clínica"
                width={88}
                height={88}
                className="lp-avatar-img"
                priority
              />
            </div>
            <h1 className="lp-title">Gestão Clínica</h1>
            <p className="lp-subtitle">Portal Administrativo</p>
          </div>

          {/* Card branco */}
          <div className="lp-form-card">
            <h2 className="lp-form-title">Acesse sua conta</h2>

            <form onSubmit={handleLogin} className="lp-form">

              {/* Usuário */}
              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-user">
                  <span className="lp-label-icon">👤</span> Usuário
                </label>
                <input
                  id="lp-user"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  className="lp-input"
                  autoComplete="username"
                  disabled={attempts >= 5}
                />
              </div>

              {/* Senha */}
              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-pass">
                  <span className="lp-label-icon">🔑</span> Senha
                </label>
                <div className="lp-pw-wrap">
                  <input
                    id="lp-pass"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="lp-input lp-pw-input"
                    autoComplete="current-password"
                    disabled={attempts >= 5}
                  />
                  <button
                    type="button"
                    className="lp-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <EyeOff size={16} strokeWidth={2.2} />
                      : <Eye size={16} strokeWidth={2.2} />
                    }
                  </button>
                </div>
              </div>

              {/* Mensagem de erro */}
              {error && <div className="lp-error">{error}</div>}

              {/* Botão */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading || attempts >= 5}
                className="lp-submit"
              >
                {loading ? (
                  <Loader2 className="lp-spin" size={22} />
                ) : (
                  <>
                    <span className="lp-btn-main">
                      Entrar<br />Seguramente
                    </span>
                    <ArrowRight size={18} className="lp-btn-arrow" strokeWidth={2.5} />
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Rodapé */}
          <div className="lp-footer">
            🔒 Acesso seguro&nbsp;•&nbsp;Tentativas: {attempts}/5
          </div>

        </div>
      </div>
    </>
  );
}
