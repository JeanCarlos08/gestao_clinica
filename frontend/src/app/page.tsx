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
    <div className="login-bg">
      {/* Círculos de profundidade no fundo */}
      <div className="bg-circle bg-circle-1" />
      <div className="bg-circle bg-circle-2" />
      <div className="bg-circle bg-circle-3" />

      {/* Card principal */}
      <div className="login-card-outer">
        {/* Topo: botão compartilhar */}
        <div className="share-bar">
          <button className="share-btn" type="button">
            Compartilhar&nbsp;☆
          </button>
        </div>

        {/* Avatar + título */}
        <div className="login-header">
          <div className="avatar-wrap">
            <Image
              src="/avatar.png"
              alt="Gestão Clínica"
              width={80}
              height={80}
              className="avatar-img"
              priority
            />
          </div>
          <h1 className="login-title">Gestão Clínica</h1>
          <p className="login-subtitle">PORTAL ADMINISTRATIVO</p>
        </div>

        {/* Card branco com formulário */}
        <div className="login-form-card">
          <h2 className="form-heading">Acesse sua conta</h2>

          <form onSubmit={handleLogin} className="login-form">
            {/* Usuário */}
            <div className="field-group">
              <label className="field-label">
                <span className="field-icon">👤</span> Usuário
              </label>
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                className="field-input"
                autoComplete="username"
              />
            </div>

            {/* Senha */}
            <div className="field-group">
              <label className="field-label">
                <span className="field-icon">🔑</span> Senha
              </label>
              <div className="password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="field-input password-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="error-msg">{error}</div>
            )}

            {/* Botão */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading || attempts >= 5}
              className="submit-btn"
            >
              {loading ? (
                <Loader2 className="spin-icon" size={20} />
              ) : (
                <>
                  Entrar<br />Seguramente
                  <ArrowRight size={16} className="arrow-icon" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <div className="login-footer">
          🔒 Acesso seguro&nbsp;•&nbsp;Tentativas: {attempts}/5
        </div>
      </div>

      <style>{`
        /* Reset e base */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-bg {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(ellipse 80% 60% at 20% 30%, rgba(60,140,80,0.45) 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 80% 70%, rgba(40,100,60,0.35) 0%, transparent 55%),
            radial-gradient(ellipse 90% 80% at 50% 50%, rgba(180,210,180,0.08) 0%, transparent 70%),
            linear-gradient(160deg, #1c5e35 0%, #0e3d1e 40%, #1a5830 70%, #0b3318 100%);
        }

        /* Círculos de fundo para simular profundidade */
        .bg-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
          opacity: 0.25;
        }
        .bg-circle-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #a8d5b0 0%, transparent 70%);
          top: -150px; left: -150px;
        }
        .bg-circle-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #c5e8ca 0%, transparent 70%);
          bottom: -100px; right: -100px;
        }
        .bg-circle-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #e8f5e8 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.08;
        }

        /* Card externo (o "telefone" verde) */
        .login-card-outer {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 360px;
          border-radius: 24px;
          overflow: hidden;
          box-shadow:
            0 30px 80px rgba(0,0,0,0.5),
            0 0 0 1px rgba(255,255,255,0.08) inset;
          background: linear-gradient(160deg, #1e6b3e 0%, #155228 50%, #0f3d20 100%);
          animation: fadeInUp 0.5s ease forwards;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Barra de compartilhar */
        .share-bar {
          display: flex;
          justify-content: flex-end;
          padding: 12px 16px 0;
        }
        .share-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.75);
          font-size: 12px;
          font-family: inherit;
          transition: color 0.2s;
        }
        .share-btn:hover { color: #fff; }

        /* Cabeçalho com avatar e título */
        .login-header {
          text-align: center;
          padding: 12px 24px 24px;
        }
        .avatar-wrap {
          width: 84px;
          height: 84px;
          border-radius: 16px;
          overflow: hidden;
          margin: 0 auto 16px;
          border: 3px solid rgba(255,255,255,0.25);
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        }
        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .login-title {
          font-size: 26px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          line-height: 1.2;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .login-subtitle {
          margin-top: 4px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2.5px;
          color: rgba(255,255,255,0.65);
          text-transform: uppercase;
        }

        /* Card branco do formulário */
        .login-form-card {
          margin: 0 14px;
          background: #ffffff;
          border-radius: 18px;
          padding: 24px 22px 28px;
          box-shadow:
            0 4px 30px rgba(0,0,0,0.2),
            0 1px 0 rgba(255,255,255,0.9) inset;
        }
        .form-heading {
          text-align: center;
          font-size: 17px;
          font-weight: 700;
          color: #1e6b3e;
          margin-bottom: 20px;
        }

        .login-form { display: flex; flex-direction: column; gap: 14px; }

        /* Grupos de campo */
        .field-group { display: flex; flex-direction: column; gap: 5px; }
        .field-label {
          font-size: 13px;
          font-weight: 600;
          color: #1e6b3e;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .field-icon { font-size: 14px; }

        .field-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #d8e8dc;
          border-radius: 10px;
          font-size: 14px;
          color: #1a1a1a;
          background: #f8fdf9;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .field-input:focus {
          border-color: #1e6b3e;
          box-shadow: 0 0 0 3px rgba(30,107,62,0.12);
          background: #fff;
        }
        .field-input::placeholder { color: #aabfb0; }

        /* Campo senha */
        .password-wrap { position: relative; }
        .password-input { padding-right: 44px; }
        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: #1e6b3e;
          border: none;
          cursor: pointer;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .eye-btn:hover { background: #155228; }

        /* Erro */
        .error-msg {
          background: #fff0f0;
          border: 1px solid #ffcdd2;
          color: #c62828;
          font-size: 12px;
          text-align: center;
          padding: 8px 12px;
          border-radius: 8px;
        }

        /* Botão de submit */
        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #1e6b3e 0%, #155228 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 14px 20px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
          line-height: 1.3;
          transition: transform 0.15s, box-shadow 0.15s, background 0.2s;
          box-shadow: 0 4px 16px rgba(30,107,62,0.4);
          font-family: inherit;
          margin-top: 4px;
        }
        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #155228 0%, #0f3d1e 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(30,107,62,0.5);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .arrow-icon { flex-shrink: 0; }
        .spin-icon { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Rodapé */
        .login-footer {
          text-align: center;
          padding: 16px 0 20px;
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          letter-spacing: 0.3px;
        }

        /* Responsivo */
        @media (max-width: 400px) {
          .login-card-outer { border-radius: 20px; }
          .login-title { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}
