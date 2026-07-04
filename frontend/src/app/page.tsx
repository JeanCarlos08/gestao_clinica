"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Shield, Sparkles, X } from "lucide-react";

const API = () => process.env.NEXT_PUBLIC_API_URL || "/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [consentModal, setConsentModal] = useState<null | "google" | "microsoft" | "apple">(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(`${API()}/token`, {
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

  // Registra consentimento e redireciona para OAuth do provedor
  const handleSocialLogin = async (provider: "google" | "microsoft" | "apple") => {
    // Registra consentimento LGPD antes de redirecionar
    try {
      await fetch(`${API()}/lgpd/consentimentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titular_nome: "Usuário",
          finalidade: "agendamento",
          base_legal: "consentimento",
          provider,
        }),
      });
    } catch { /* não bloquear o login se o registro de consentimento falhar */ }

    if (provider === "google") {
      window.location.href = `${API()}/auth/google`;
    } else {
      // Microsoft e Apple: em desenvolvimento
      setError(`Login com ${provider === "microsoft" ? "Microsoft" : "Apple"} em breve.`);
      setConsentModal(null);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Inter', system-ui, sans-serif;
          background: #020804;
          overflow: hidden;
          position: relative;
        }

        /* ── LEFT PANEL ─────────────────────────────── */
        .auth-left {
          display: none;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 960px) {
          .auth-left { display: flex; flex: 1; flex-direction: column; justify-content: flex-end; padding: 48px; }
        }
        .auth-left-bg {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(2,8,4,0.15) 0%, rgba(2,8,4,0.75) 100%),
            url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=85');
          background-size: cover;
          background-position: center;
          z-index: 0;
        }
        .auth-left-content {
          position: relative; z-index: 1;
        }
        .auth-left-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25);
          color: #4ade80; font-size: 11px; font-weight: 600; letter-spacing: 1.5px;
          text-transform: uppercase; padding: 6px 14px; border-radius: 100px; margin-bottom: 20px;
          backdrop-filter: blur(8px);
        }
        .auth-left-title {
          font-size: 42px; font-weight: 800; color: #fff; line-height: 1.12;
          letter-spacing: -1px; margin-bottom: 16px;
          text-shadow: 0 2px 20px rgba(0,0,0,0.5);
        }
        .auth-left-title span { color: #4ade80; }
        .auth-left-desc {
          font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.65; max-width: 340px; margin-bottom: 36px;
        }
        .auth-left-stats {
          display: flex; gap: 28px;
        }
        .auth-stat {
          display: flex; flex-direction: column;
        }
        .auth-stat-num {
          font-size: 26px; font-weight: 800; color: #4ade80; letter-spacing: -0.5px;
        }
        .auth-stat-label {
          font-size: 11px; color: rgba(255,255,255,0.45); letter-spacing: 0.5px; margin-top: 2px;
        }

        /* ── RIGHT PANEL ────────────────────────────── */
        .auth-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          position: relative;
          background: #030b05;
          min-height: 100vh;
        }
        .auth-right::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 600px 500px at 50% -10%, rgba(34,197,94,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 110% 80%, rgba(34,197,94,0.04) 0%, transparent 60%);
          pointer-events: none;
        }

        /* grid dots */
        .auth-right::after {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        .auth-box {
          position: relative; z-index: 1;
          width: 100%; max-width: 420px;
          animation: authFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Logo / brand */
        .auth-brand {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          margin-bottom: 36px; text-align: center;
        }
        .auth-brand-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: linear-gradient(135deg, #166534 0%, #052e16 100%);
          border: 1px solid rgba(74,222,128,0.2);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 32px rgba(34,197,94,0.2), 0 8px 24px rgba(0,0,0,0.4);
          font-size: 24px;
        }
        .auth-brand-name {
          font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.4px;
        }
        .auth-brand-tagline {
          font-size: 12px; color: rgba(255,255,255,0.35); letter-spacing: 0.5px;
        }

        /* Card */
        .auth-card {
          background: rgba(10,18,11,0.9);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          padding: 32px;
          box-shadow:
            0 0 0 1px rgba(34,197,94,0.06) inset,
            0 32px 64px rgba(0,0,0,0.5),
            0 8px 24px rgba(0,0,0,0.3);
          backdrop-filter: blur(20px);
        }

        .auth-card-title {
          font-size: 24px; font-weight: 800; color: #fff;
          letter-spacing: -0.5px; margin-bottom: 4px;
        }
        .auth-card-sub {
          font-size: 13px; color: rgba(255,255,255,0.38); margin-bottom: 28px;
        }

        /* Social buttons */
        .auth-socials {
          display: flex; gap: 10px; margin-bottom: 24px;
        }
        .auth-social-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 11px 14px; border-radius: 12px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
          white-space: nowrap;
        }
        .auth-social-btn:hover {
          background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15);
          color: #fff; transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .auth-social-btn svg { flex-shrink: 0; }

        /* Divider */
        .auth-divider {
          display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
        }
        .auth-divider-line {
          flex: 1; height: 1px; background: rgba(255,255,255,0.07);
        }
        .auth-divider-text {
          font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 0.5px;
          text-transform: uppercase; white-space: nowrap;
        }

        /* Form */
        .auth-form { display: flex; flex-direction: column; gap: 16px; }

        .auth-field { display: flex; flex-direction: column; gap: 6px; }
        .auth-label {
          font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5);
          letter-spacing: 0.5px; text-transform: uppercase;
        }
        .auth-input-wrap { position: relative; }
        .auth-input {
          width: 100%; padding: 13px 16px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; font-size: 14px; color: #fff;
          outline: none; transition: all 0.2s; font-family: inherit;
        }
        .auth-input:focus {
          border-color: rgba(74,222,128,0.4);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 3px rgba(34,197,94,0.08);
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.2); }
        .auth-input-pr { padding-right: 48px; }

        .auth-eye {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.3); transition: color 0.2s; padding: 4px;
        }
        .auth-eye:hover { color: rgba(255,255,255,0.7); }

        /* Error */
        .auth-error {
          display: flex; align-items: center; gap-8px;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          color: #f87171; font-size: 12.5px; font-weight: 500;
          padding: 10px 14px; border-radius: 10px; text-align: center;
          justify-content: center;
        }

        /* Submit */
        .auth-submit {
          width: 100%; padding: 14px 20px; border-radius: 13px; border: none;
          background: linear-gradient(135deg, #16a34a 0%, #052e16 100%);
          color: #fff; font-size: 15px; font-weight: 700; letter-spacing: -0.2px;
          cursor: pointer; font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(22,163,74,0.35), 0 1px 0 rgba(255,255,255,0.1) inset;
          position: relative; overflow: hidden;
        }
        .auth-submit::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%);
          pointer-events: none;
        }
        .auth-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(22,163,74,0.5), 0 1px 0 rgba(255,255,255,0.1) inset;
        }
        .auth-submit:active:not(:disabled) { transform: translateY(0); }
        .auth-submit:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        .auth-spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Footer */
        .auth-card-footer {
          margin-top: 20px; text-align: center;
          font-size: 12px; color: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }

        /* Bottom branding */
        .auth-bottom {
          position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
          font-size: 11px; color: rgba(255,255,255,0.15); white-space: nowrap;
          z-index: 1;
        }
      `}</style>

      <div className="auth-root">
        {/* ── LEFT PANEL ── */}
        <div className="auth-left">
          <div className="auth-left-bg" />
          <div className="auth-left-content">
            <div className="auth-left-tag">
              <Sparkles size={12} /> Plataforma Premium
            </div>
            <h1 className="auth-left-title">
              Gestão clínica<br />com <span>inteligência</span><br />artificial
            </h1>
            <p className="auth-left-desc">
              Automatize laudos, gerencie pacientes e tome decisões baseadas em dados — tudo em um único lugar.
            </p>
            <div className="auth-left-stats">
              <div className="auth-stat">
                <span className="auth-stat-num">+2.4k</span>
                <span className="auth-stat-label">Atendimentos</span>
              </div>
              <div className="auth-stat">
                <span className="auth-stat-num">99.9%</span>
                <span className="auth-stat-label">Disponibilidade</span>
              </div>
              <div className="auth-stat">
                <span className="auth-stat-num">LGPD</span>
                <span className="auth-stat-label">Conformidade</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="auth-right">
          <div className="auth-box">
            {/* Brand */}
            <div className="auth-brand">
              <div className="auth-brand-icon">
                <Sparkles size={26} color="#4ade80" />
              </div>
              <div className="auth-brand-name">Clínica IA</div>
              <div className="auth-brand-tagline">Portal Administrativo Seguro</div>
            </div>

            {/* Card */}
            <div className="auth-card">
              <h2 className="auth-card-title">Bem-vindo de volta</h2>
              <p className="auth-card-sub">Entre com sua conta para continuar</p>

              {/* Social logins */}
              <div className="auth-socials">
                {/* Google */}
                <button type="button" className="auth-social-btn" onClick={() => setConsentModal("google")} title="Entrar com Google">
                  <svg width="17" height="17" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>

                {/* Microsoft */}
                <button type="button" className="auth-social-btn" onClick={() => setConsentModal("microsoft")} title="Entrar com Microsoft (em breve)">
                  <svg width="16" height="16" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                  </svg>
                  Microsoft
                </button>

                {/* Apple */}
                <button type="button" className="auth-social-btn" onClick={() => setConsentModal("apple")} title="Entrar com Apple (em breve)">
                  <svg width="15" height="17" viewBox="0 0 814 1000" fill="white">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.5-57.2-155.5-127.9C46.7 790.7 0 663 0 541.8c0-194.3 127.4-297.5 252.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                  </svg>
                  Apple
                </button>
              </div>

              {/* Divider */}
              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">ou entre com sua conta</span>
                <div className="auth-divider-line" />
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-user">Usuário</label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-user"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="seu.usuario"
                      className="auth-input"
                      autoComplete="username"
                      disabled={attempts >= 5}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-pass">Senha</label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-pass"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="auth-input auth-input-pr"
                      autoComplete="current-password"
                      disabled={attempts >= 5}
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="auth-error">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading || attempts >= 5}
                  className="auth-submit"
                  style={{ marginTop: 4 }}
                >
                  {loading ? (
                    <Loader2 size={20} className="auth-spin" />
                  ) : (
                    <>
                      <Shield size={17} strokeWidth={2.5} />
                      Entrar com segurança
                    </>
                  )}
                </button>
              </form>

              <div className="auth-card-footer">
                <Shield size={12} />
                Acesso protegido &nbsp;·&nbsp; Tentativas: {attempts}/5
              </div>
            </div>
          </div>

          <div className="auth-bottom">Clínica IA v2.0 &nbsp;·&nbsp; © 2025 Todos os direitos reservados</div>
        </div>
      </div>

      {/* Modal de consentimento LGPD */}
      {consentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1a0e] border border-[rgba(34,197,94,0.2)] shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] flex items-center justify-center flex-shrink-0">
                  <Shield size={18} className="text-[#22c55e]" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base leading-tight">Consentimento LGPD</h2>
                  <p className="text-[11px] text-[#6b7c6b]">Lei nº 13.709/2018 — Art. 8º</p>
                </div>
              </div>
              <button onClick={() => setConsentModal(null)} className="p-1.5 rounded-lg text-[#6b7c6b] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="text-sm text-[#a3b5a3] leading-relaxed space-y-2">
              <p>Ao continuar, você <strong className="text-white">autoriza</strong> o tratamento dos seus dados pessoais (nome, e-mail) para:</p>
              <ul className="list-disc list-inside space-y-1 text-[#8fa88f] pl-1">
                <li>Identificação e autenticação na plataforma</li>
                <li>Agendamento e gestão de atendimentos clínicos</li>
                <li>Comunicação sobre consultas e resultados</li>
              </ul>
              <p className="text-xs text-[#6b7c6b] pt-1">
                Base legal: <strong>Consentimento</strong> (Art. 7º, I). Você pode revogar a qualquer momento em <em>Configurações &rsaquo; Privacidade</em>.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConsentModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.04] text-[#a3b5a3] border border-[rgba(255,255,255,0.08)] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSocialLogin(consentModal)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#22c55e] text-black hover:opacity-90 transition-opacity"
              >
                Aceitar e Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
