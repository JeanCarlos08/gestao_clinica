"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Shield, Sparkles, X } from "lucide-react";
import { API as API_BASE } from "@/lib/api";

const API = API_BASE;

/* ── Partículas em canvas (rede de pontos) ───────────────── */
function ParticleNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, DPR = 1;
    const size = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = W * DPR;
      cv.height = H * DPR;
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    const N = window.innerWidth < 700 ? 24 : 40;
    const ps = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6,
      a: Math.random() * 0.5 + 0.25,
      h: Math.random() < 0.15,
    }));

    let raf = 0;
    let lastT = 0;
    const loop = (ts: number) => {
      if (ts - lastT >= 32) {
        lastT = ts;
        ctx.clearRect(0, 0, W, H);
        for (const p of ps) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = W;
          if (p.x > W) p.x = 0;
          if (p.y < 0) p.y = H;
          if (p.y > H) p.y = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 6.2832);
          ctx.fillStyle = p.h
            ? "rgba(123,207,138," + p.a + ")"
            : "rgba(255,255,255," + p.a * 0.55 + ")";
          ctx.fill();
        }
        for (let i = 0; i < N; i++) {
          for (let j = i + 1; j < N; j++) {
            const a = ps[i], b = ps[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 110 * 110) {
              const o = (1 - Math.sqrt(d2) / 110) * 0.14;
              ctx.strokeStyle = "rgba(123,207,138," + o + ")";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  return <canvas ref={ref} className="auth-canvas" aria-hidden="true" />;
}

/* ── Glow de cursor (glow + anel com follow + ponto) ─────── */
function CursorFX() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const g = document.createElement("div");
    g.id = "auth-cursor-glow";
    g.style.cssText =
      "position:fixed;left:0;top:0;width:380px;height:380px;margin:-190px 0 0 -190px;border-radius:50%;pointer-events:none!important;z-index:2147483000;background:radial-gradient(circle,rgba(77,167,104,.34),rgba(46,204,113,.12) 45%,transparent 70%);filter:blur(6px);opacity:0;transition:opacity .35s ease;will-change:transform;";
    const ring = document.createElement("div");
    ring.id = "auth-cursor-ring";
    ring.style.cssText =
      "position:fixed;left:0;top:0;width:42px;height:42px;margin:-21px 0 0 -21px;border-radius:50%;pointer-events:none!important;z-index:2147483001;border:1.5px solid rgba(168,232,183,.75);box-shadow:0 0 18px rgba(77,167,104,.45),inset 0 0 12px rgba(77,167,104,.25);opacity:0;transition:opacity .3s ease;will-change:transform;";
    const dot = document.createElement("div");
    dot.id = "auth-cursor-dot";
    dot.style.cssText =
      "position:fixed;left:0;top:0;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;pointer-events:none!important;z-index:2147483002;background:#a8e8b7;box-shadow:0 0 10px #4DA768;opacity:0;transition:opacity .3s ease;will-change:transform;";
    document.body.appendChild(g);
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    let mx = -999, my = -999, rx = -999, ry = -999;
    let started = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!started) {
        started = true;
        rx = mx;
        ry = my;
      }
      g.style.opacity = "1";
      ring.style.opacity = "1";
      dot.style.opacity = "1";
      g.style.transform = `translate3d(${mx}px,${my}px,0)`;
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
    };
    const onLeave = () => {
      g.style.opacity = "0";
      ring.style.opacity = "0";
      dot.style.opacity = "0";
    };
    const follow = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      raf = requestAnimationFrame(follow);
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(follow);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      [g, ring, dot].forEach((el) => el.remove());
    };
  }, []);

  return null;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [consentModal, setConsentModal] = useState<null | "google" | "microsoft" | "apple">(null);
  const [introDelay, setIntroDelay] = useState("0.9s");
  const [clock, setClock] = useState("--:--:--");
  const router = useRouter();

  /* Intro em 2 tempos: 0.9s só na primeira visita; depois nunca repete */
  useEffect(() => {
    try {
      if (localStorage.getItem("auth_intro_shown")) {
        setIntroDelay("0s");
        return;
      }
      localStorage.setItem("auth_intro_shown", "1");
    } catch {
      /* localStorage indisponível — segue com intro padrão */
    }
  }, []);

  /* Relógio ao vivo */
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const p = (v: number) => String(v).padStart(2, "0");
      setClock(`${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("password", password);

      const response = await fetch(`${API}/token`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setAttempts((prev) => Math.min(prev + 1, 5));
        let msg =
          response.status === 401
            ? "Usuário ou senha incorretos"
            : response.status === 429
              ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
              : "Erro ao fazer login. Tente novamente.";
        try {
          const body = await response.json();
          if (body?.detail) msg = body.detail;
        } catch {
          /* corpo não-JSON — mantém mensagem por status */
        }
        throw new Error(msg);
      }

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
      router.push("/atendimentos");
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        setError("Falha de conexão. Verifique sua internet.");
      } else {
        setError(err instanceof Error ? err.message : "Erro ao fazer login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Registra consentimento e redireciona para OAuth do provedor
  const handleSocialLogin = async (provider: "google" | "microsoft" | "apple") => {
    try {
      await fetch(`${API}/lgpd/consentimentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titular_nome: "Usuário",
          finalidade: "agendamento",
          base_legal: "consentimento",
          provider,
        }),
      });
    } catch (e) {
      console.debug("Consentimento LGPD não registrado:", e);
    }

    if (provider === "google") {
      window.location.href = `${API}/auth/google`;
    } else if (provider === "microsoft") {
      window.location.href = `${API}/auth/microsoft`;
    } else if (provider === "apple") {
      window.location.href = `${API}/auth/apple`;
    }
  };

  /* Botão magnético */
  const onMagneticMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / r.width;
    const y = (e.clientY - r.top - r.height / 2) / r.height;
    btn.style.transform = `translate(${(x * 10).toFixed(1)}px,${(y * 8 - 3).toFixed(1)}px) scale(1.02)`;
  };
  const onMagneticLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "";
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body.h-dvh { height: auto !important; overflow: visible !important; }
        body.app-premium-bg::before, body.app-premium-bg::after { display: none !important; }
        main:has(.auth-root) { padding-top: 0 !important; }

        @property --auth-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }

        .auth-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: var(--font-inter), 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
          padding: 40px 20px;
          /* Wallpaper + overlay cinematográfico */
          background:
            radial-gradient(ellipse at center, transparent 32%, rgba(0,0,0,0.55) 100%),
            linear-gradient(rgba(255,255,255,0.024) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.024) 1px, transparent 1px),
            linear-gradient(160deg, rgba(30,92,53,0.55) 0%, rgba(16,52,30,0.68) 100%),
            url('/login-bg.jpg');
          background-size: 100% 100%, 56px 56px, 56px 56px, 100% 100%, cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
        }
        ::selection { background: rgba(77,167,104,0.45); color: #fff; }

        /* Grain / film noise */
        .auth-grain {
          position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
          opacity: 0.05;
          mix-blend-mode: overlay;
          pointer-events: none;
          z-index: 0;
          animation: authGrain 3s steps(3) infinite;
        }
        @keyframes authGrain {
          0% { transform: translate(0,0); }
          25% { transform: translate(-1%,1%); }
          50% { transform: translate(1%,-1%); }
          75% { transform: translate(-1%,-1%); }
          100% { transform: translate(0,0); }
        }

        /* Canvas de partículas */
        .auth-canvas {
          position: fixed; inset: 0;
          width: 100vw; height: 100vh;
          display: block;
          pointer-events: none;
          z-index: 0;
        }

        /* Orbes animadas */
        .auth-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(56px);
          pointer-events: none;
          z-index: 0;
        }
        .auth-orb-a {
          width: 760px; height: 760px; left: -180px; top: -200px;
          background: radial-gradient(circle, rgba(77,167,104,0.34), transparent 68%);
          animation: authOrbA 14s ease-in-out infinite alternate;
        }
        .auth-orb-b {
          width: 640px; height: 640px; right: -170px; bottom: -190px;
          background: radial-gradient(circle, rgba(46,204,113,0.26), transparent 70%);
          filter: blur(52px);
          animation: authOrbB 18s ease-in-out infinite alternate;
        }
        .auth-orb-c {
          width: 480px; height: 480px; left: 42%; top: -140px;
          background: radial-gradient(circle, rgba(123,207,138,0.14), transparent 70%);
          filter: blur(60px);
          animation: authOrbC 22s ease-in-out infinite alternate;
        }
        @keyframes authOrbA { from { transform: translate(0,0); } to { transform: translate(70px,50px); } }
        @keyframes authOrbB { from { transform: translate(0,0); } to { transform: translate(-55px,-45px); } }
        @keyframes authOrbC { from { transform: translate(0,0); opacity: 0.7; } to { transform: translate(40px,60px); opacity: 1; } }

        /* Aurora ribbons + faíscas */
        .auth-fx { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .auth-fx .aur { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.5; }
        .auth-fx .aur1 { width: 520px; height: 220px; left: -80px; top: 18%; background: linear-gradient(90deg, rgba(46,204,113,0.35), transparent); animation: authAur1 16s ease-in-out infinite alternate; }
        .auth-fx .aur2 { width: 460px; height: 200px; right: -60px; bottom: 16%; background: linear-gradient(270deg, rgba(123,207,138,0.3), transparent); animation: authAur2 20s ease-in-out infinite alternate; }
        @keyframes authAur1 { from { transform: translateX(-30px); } to { transform: translateX(80px); } }
        @keyframes authAur2 { from { transform: translateX(30px); } to { transform: translateX(-70px); } }
        .auth-fx .p {
          position: absolute; width: 4px; height: 4px; border-radius: 50%;
          background: rgba(168,232,183,0.85);
          box-shadow: 0 0 10px rgba(123,207,138,0.8);
          opacity: 0;
          animation: authSpark linear infinite;
        }
        .auth-fx .p1 { left: 12%; top: 70%; animation-duration: 9s; animation-delay: 0s; }
        .auth-fx .p2 { left: 22%; top: 40%; animation-duration: 11s; animation-delay: 1.2s; width: 3px; height: 3px; }
        .auth-fx .p3 { left: 48%; top: 80%; animation-duration: 10s; animation-delay: 2.4s; }
        .auth-fx .p4 { left: 68%; top: 55%; animation-duration: 12s; animation-delay: 0.6s; width: 5px; height: 5px; }
        .auth-fx .p5 { left: 82%; top: 30%; animation-duration: 8.5s; animation-delay: 3s; }
        .auth-fx .p6 { left: 90%; top: 65%; animation-duration: 13s; animation-delay: 1.8s; width: 3px; height: 3px; }
        .auth-fx .p7 { left: 35%; top: 25%; animation-duration: 10.5s; animation-delay: 4s; }
        .auth-fx .p8 { left: 58%; top: 15%; animation-duration: 9.5s; animation-delay: 2s; width: 2.5px; height: 2.5px; }
        @keyframes authSpark {
          0% { transform: translateY(30px) scale(0.4); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 0.7; }
          100% { transform: translateY(-120px) scale(1.2); opacity: 0; }
        }

        /* ── CARD ─────────────────────────────────────── */
        .auth-box {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 460px;
          --auth-t0: 0.9s;
          animation: authIn 0.7s cubic-bezier(0.16,1,0.3,1) var(--auth-t0) backwards;
          will-change: opacity, transform;
        }
        /* Halo escuro atrás do card (legibilidade sobre o wallpaper) */
        .auth-box::before {
          content: "";
          position: absolute;
          inset: -56px -40px;
          background: radial-gradient(ellipse at center, rgba(3,17,10,0.82) 0%, rgba(3,17,10,0.5) 45%, transparent 72%);
          filter: blur(14px);
          pointer-events: none;
          z-index: -1;
        }
        @keyframes authIn {
          0% { opacity: 0; transform: translateY(26px) scale(0.965); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes authUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes authSweep { 0% { transform: translateX(-120%) skewX(-18deg); } 100% { transform: translateX(240%) skewX(-18deg); } }
        @keyframes authPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); } 60% { box-shadow: 0 0 0 9px rgba(74,222,128,0); } }
        @keyframes authFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes authBtnGlow {
          0%,100% { box-shadow: 0 14px 32px rgba(77,167,104,0.38), 0 0 0 0 rgba(77,167,104,0.35), inset 0 1.5px 0 rgba(255,255,255,0.35); }
          50% { box-shadow: 0 14px 32px rgba(77,167,104,0.45), 0 0 18px 4px rgba(77,167,104,0.28), inset 0 1.5px 0 rgba(255,255,255,0.35); }
        }
        @keyframes authSpinBorder { from { --auth-angle: 0deg; } to { --auth-angle: 360deg; } }

        .auth-card {
          position: relative;
          border-radius: 30px;
          padding: 36px clamp(22px, 4vw, 40px) 30px;
          overflow: hidden;
          background:
            radial-gradient(130% 70% at 50% -12%, rgba(255,255,255,0.15), transparent 62%),
            radial-gradient(90% 60% at 110% 110%, rgba(46,204,113,0.16), transparent 60%),
            linear-gradient(155deg, rgba(7,32,19,0.86) 0%, rgba(3,16,10,0.78) 55%, rgba(6,26,16,0.84) 100%);
          border: 1px solid rgba(255,255,255,0.17);
          box-shadow:
            0 48px 100px rgba(0,0,0,0.6),
            0 10px 28px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.2),
            inset 0 -1px 0 rgba(0,0,0,0.3);
          backdrop-filter: blur(42px) saturate(150%) contrast(106%);
          -webkit-backdrop-filter: blur(42px) saturate(150%) contrast(106%);
          transition: transform 0.45s cubic-bezier(0.16,1,0.3,1), box-shadow 0.45s ease;
        }
        .auth-card:hover {
          transform: translateY(-4px) scale(1.004);
          box-shadow: 0 56px 110px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        /* Borda cinética conic */
        .auth-card::before {
          content: "";
          position: absolute; inset: 0;
          padding: 1.6px;
          border-radius: 30px;
          background: conic-gradient(from var(--auth-angle, 0deg),
            transparent 0%,
            rgba(123,207,138,0.6) 10%,
            transparent 26%,
            transparent 55%,
            rgba(46,204,113,0.5) 74%,
            transparent 90%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
          z-index: 3;
          animation: authSpinBorder 20s steps(200) linear infinite;
        }
        /* Specular sweep */
        .auth-card::after {
          content: "";
          position: absolute; inset: 0;
          border-radius: 30px;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.07) 45%, rgba(255,255,255,0.02) 55%, transparent 70%);
          pointer-events: none;
          z-index: 2;
          opacity: 0.9;
        }

        /* Brand */
        .auth-brand {
          position: relative; z-index: 1;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          margin-bottom: 24px; text-align: center;
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.05s) backwards;
        }
        .auth-brand-icon {
          width: 56px; height: 56px; border-radius: 17px;
          background: linear-gradient(135deg, #4DA768 0%, #1E7A46 55%, #0d3a22 100%);
          border: 1px solid rgba(168,232,183,0.35);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 32px rgba(77,167,104,0.35), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.35);
          animation: authFloat 4s ease-in-out infinite;
        }
        .auth-brand-name {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-size: 23px; font-weight: 800; letter-spacing: -0.5px;
          background: linear-gradient(120deg, #ffffff 20%, #d8f5e2 65%, #a8e8b7 100%);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .auth-brand-tagline {
          font-size: 11.5px; color: rgba(255,255,255,0.45); letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        /* Form head */
        .auth-form-head {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          margin-bottom: 18px;
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.1s) both;
        }
        .auth-form-head h3 {
          margin: 0;
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          background: linear-gradient(120deg, #ffffff 20%, #d8f5e2 65%, #a8e8b7 100%);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          font-size: 1.3rem; font-weight: 800; letter-spacing: -0.7px;
        }
        .auth-secure {
          display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 999px;
          background: linear-gradient(135deg, rgba(77,167,104,0.22), rgba(46,204,113,0.08));
          border: 1px solid rgba(123,207,138,0.34);
          color: #d2f7dc;
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18);
          white-space: nowrap;
        }
        .auth-secure::before {
          content: ""; width: 6px; height: 6px; border-radius: 50%;
          background: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.8);
          animation: authPulse 2s ease-out infinite;
        }

        /* Portal */
        .auth-portal {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 16px;
          background: linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.11); margin-bottom: 18px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 10px 26px rgba(0,0,0,0.2);
          transition: border-color 0.3s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1);
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.2s) backwards;
        }
        .auth-portal:hover { border-color: rgba(123,207,138,0.35); transform: translateY(-2px); }
        .auth-portal-av {
          width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
          display: grid; place-items: center; font-size: 1.25rem; line-height: 1;
          background: linear-gradient(135deg, rgba(77,167,104,0.4), rgba(46,204,113,0.16));
          border: 1.5px solid rgba(255,255,255,0.22);
          box-shadow: 0 0 0 3px rgba(77,167,104,0.22), 0 10px 22px rgba(0,0,0,0.3);
          transition: transform 0.3s ease;
        }
        .auth-portal:hover .auth-portal-av { transform: scale(1.06) rotate(-4deg); }
        .auth-portal b { color: #fff; font-size: 0.92rem; font-weight: 700; display: block; letter-spacing: -0.2px; }
        .auth-portal span { color: rgba(255,255,255,0.68); font-size: 0.74rem; font-weight: 500; }
        .auth-portal-dot {
          width: 9px; height: 9px; border-radius: 50%; background: #4ade80; flex-shrink: 0;
          box-shadow: 0 0 10px rgba(74,222,128,0.7), 0 0 0 5px rgba(74,222,128,0.16);
          animation: authPulse 2.4s ease-out infinite;
        }

        /* Socials */
        .auth-socials {
          position: relative; z-index: 1;
          display: flex; gap: 10px; margin-bottom: 18px;
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.25s) backwards;
        }
        .auth-social-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 11px 12px; border-radius: 13px;
          background: rgba(8,18,13,0.55); border: 1.5px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.82); font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: all 0.25s; font-family: inherit;
          white-space: nowrap;
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.22);
        }
        .auth-social-btn:hover {
          background: rgba(12,26,18,0.8); border-color: rgba(123,207,138,0.55);
          color: #fff; transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(0,0,0,0.35), 0 0 0 3px rgba(77,167,104,0.14);
        }
        .auth-social-btn svg { flex-shrink: 0; }

        /* Divider */
        .auth-divider {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.28s) backwards;
        }
        .auth-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.12); }
        .auth-divider-text {
          font-size: 11px; color: rgba(255,255,255,0.35); letter-spacing: 0.5px;
          text-transform: uppercase; white-space: nowrap;
        }

        /* Form */
        .auth-form {
          position: relative; z-index: 1;
          display: flex; flex-direction: column; gap: 16px;
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.3s) both;
        }
        .auth-field { display: flex; flex-direction: column; gap: 8px; }
        .auth-label {
          font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.88);
          letter-spacing: 1.2px; text-transform: uppercase;
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .auth-input-wrap { position: relative; }
        .auth-input {
          width: 100%; padding: 15px 16px;
          background-color: rgba(8,18,13,0.78);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
          border: 1.5px solid rgba(255,255,255,0.16);
          border-radius: 14px; font-size: 1rem; color: #fff;
          outline: none; font-family: inherit; font-weight: 500;
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.22);
          transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, transform 0.25s ease;
        }
        .auth-input:hover { border-color: rgba(255,255,255,0.26); transform: translateY(-1px); }
        .auth-input:focus {
          border-color: rgba(123,207,138,0.75);
          background-color: rgba(12,26,18,0.85);
          background-image: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06));
          box-shadow: 0 0 0 4px rgba(77,167,104,0.26), 0 10px 26px rgba(0,0,0,0.3), inset 0 2px 6px rgba(0,0,0,0.14);
          transform: translateY(-1px);
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.4); }
        .auth-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff;
          -webkit-box-shadow: 0 0 0 1000px rgba(20,40,30,0.92) inset;
          transition: background-color 5000s ease-in-out 0s;
          caret-color: #fff;
        }
        .auth-input-pr { padding-right: 48px; }

        .auth-eye {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.35); transition: color 0.2s; padding: 4px;
        }
        .auth-eye:hover { color: rgba(255,255,255,0.8); }

        .auth-error {
          display: flex; align-items: center; gap: 8px;
          background: rgba(239,68,68,0.1); border: 1.5px solid rgba(239,68,68,0.3);
          color: #fca5a5; font-size: 12.5px; font-weight: 600;
          padding: 11px 14px; border-radius: 12px; text-align: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          animation: authUp 0.35s ease both;
        }

        /* Submit magnético */
        .auth-submit {
          position: relative; overflow: hidden;
          width: 100%; padding: 16px 22px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.28);
          background: linear-gradient(135deg, #6ed48c 0%, #4DA768 42%, #2ecc71 100%);
          background-size: 170% 170%;
          color: #052417; font-size: 1.05rem; font-weight: 900; letter-spacing: 0.55px;
          cursor: pointer; font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          text-shadow: 0 1px 0 rgba(255,255,255,0.22);
          box-shadow: 0 16px 36px rgba(77,167,104,0.42), inset 0 1.5px 0 rgba(255,255,255,0.4);
          transition: transform 0.32s cubic-bezier(0.16,1,0.3,1), box-shadow 0.32s ease, filter 0.32s ease;
          will-change: transform;
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.4s) backwards,
                     authBtnGlow 3.2s ease-in-out calc(var(--auth-t0) + 1.2s) 3;
        }
        .auth-submit::after {
          content: ""; position: absolute; top: -40%; left: -60%; width: 48%; height: 180%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
          transform: skewX(-18deg) translateX(-120%);
        }
        .auth-submit:hover::after { animation: authSweep 0.7s ease; }
        .auth-submit:hover:not(:disabled) {
          filter: brightness(1.07) saturate(1.12);
          box-shadow: 0 24px 48px rgba(77,167,104,0.5), inset 0 1.5px 0 rgba(255,255,255,0.42);
          animation: none;
        }
        .auth-submit:active:not(:disabled) { transform: translateY(0) scale(0.97) !important; }
        .auth-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .auth-submit:focus-visible {
          outline: 2.5px solid rgba(123,207,138,0.9); outline-offset: 3px;
        }

        .auth-spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Rodapé do card — relógio */
        .auth-foot {
          position: relative; z-index: 1;
          display: flex; justify-content: flex-end; margin-top: 18px;
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.5s) backwards;
        }
        .auth-clock {
          font-variant-numeric: tabular-nums;
          color: rgba(255,255,255,0.55);
          font-size: 0.7rem; letter-spacing: 0.55px;
        }
        .auth-clock b { color: #a8e8b7; font-weight: 800; }

        /* Linha de marca abaixo do card */
        .auth-logo-divider {
          width: 100%; max-width: 460px;
          height: 1px; margin-top: 26px;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.16), transparent);
          position: relative; z-index: 1;
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.55s) backwards;
        }
        .auth-logo-line {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          margin-top: 16px; position: relative; z-index: 1;
          color: rgba(255,255,255,0.66); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.6px;
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.6s) backwards;
        }
        .auth-logo-foot {
          width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0;
          background: linear-gradient(135deg, #4DA768, #2ecc71);
          box-shadow: 0 8px 20px rgba(77,167,104,0.35), inset 0 1px 0 rgba(255,255,255,0.3);
          font-size: 0.98rem;
          animation: authFloat 4s ease-in-out infinite;
        }
        .auth-links {
          display: flex; gap: 14px; margin-top: 12px; position: relative; z-index: 1;
          justify-content: center;
          animation: authUp 0.55s cubic-bezier(0.16,1,0.3,1) calc(var(--auth-t0) + 0.65s) backwards;
        }
        .auth-links a {
          color: rgba(255,255,255,0.4); font-size: 11px; text-decoration: none;
          transition: color 0.2s;
        }
        .auth-links a:hover { color: #a8e8b7; }

        .auth-bottom {
          position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
          font-size: 11px; color: rgba(255,255,255,0.22); white-space: nowrap;
          z-index: 1;
        }

        @media (max-width: 540px) {
          .auth-card { padding: 30px 20px 26px; border-radius: 24px; }
          .auth-card::before, .auth-card::after { border-radius: 24px; }
          .auth-form-head h3 { font-size: 1.16rem; }
          .auth-brand-name { font-size: 20px; }
          .auth-socials { flex-wrap: wrap; }
          .auth-bottom { display: none; }
        }

        @media (pointer: coarse) {
          #auth-cursor-glow, #auth-cursor-ring { display: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-box, .auth-brand, .auth-form-head, .auth-portal, .auth-socials,
          .auth-divider, .auth-form, .auth-foot, .auth-logo-divider, .auth-logo-line,
          .auth-links, .auth-submit, .auth-card, .auth-grain, .auth-orb,
          .auth-fx .aur, .auth-fx .p, .auth-brand-icon, .auth-logo-foot,
          .auth-secure::before, .auth-portal-dot, .auth-card::before {
            animation-duration: 0.01ms !important;
            animation-delay: 0s !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
          `,
        }}
      />

      {/* ── FX de fundo ── */}
      <div className="auth-grain" aria-hidden="true" />
      <ParticleNetwork />
      <div className="auth-orb auth-orb-a" aria-hidden="true" />
      <div className="auth-orb auth-orb-b" aria-hidden="true" />
      <div className="auth-orb auth-orb-c" aria-hidden="true" />
      <div className="auth-fx" aria-hidden="true">
        <span className="aur aur1" />
        <span className="aur aur2" />
        <span className="p p1" />
        <span className="p p2" />
        <span className="p p3" />
        <span className="p p4" />
        <span className="p p5" />
        <span className="p p6" />
        <span className="p p7" />
        <span className="p p8" />
      </div>
      <CursorFX />

      <div className="auth-root" style={{ ["--auth-t0" as string]: introDelay }}>
        <div className="auth-box" style={{ ["--auth-t0" as string]: introDelay }}>
          <div className="auth-card">
            {/* Brand */}
            <div className="auth-brand">
              <div className="auth-brand-icon">
                <Sparkles size={26} color="#eafff1" />
              </div>
              <div className="auth-brand-name">MVP Psicologia</div>
              <div className="auth-brand-tagline">Prontuário • Agenda • Evoluções</div>
            </div>

            <div className="auth-form-head">
              <h3>Acesse sua conta</h3>
              <span className="auth-secure">Acesso seguro</span>
            </div>

            <div className="auth-portal">
              <div className="auth-portal-av">🩺</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <b>Portal da Clínica</b>
                <span>Use suas credenciais seguras</span>
              </div>
              <div className="auth-portal-dot" />
            </div>

            {/* Social logins */}
            <div className="auth-socials">
              <button type="button" className="auth-social-btn" onClick={() => setConsentModal("google")} title="Entrar com Google">
                <svg width="17" height="17" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>

              <button type="button" className="auth-social-btn" onClick={() => setConsentModal("microsoft")} title="Entrar com Microsoft">
                <svg width="16" height="16" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Microsoft
              </button>

              <button type="button" className="auth-social-btn" onClick={() => setConsentModal("apple")} title="Entrar com Apple">
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
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button
                type="submit"
                disabled={loading || attempts >= 5}
                className="auth-submit"
                style={{ marginTop: 4 }}
                onMouseMove={onMagneticMove}
                onMouseLeave={onMagneticLeave}
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

            <div className="auth-foot">
              <span className="auth-clock">
                v3.0 • #1E7A46 • <b>{clock}</b>
              </span>
            </div>
          </div>

          <div className="auth-logo-divider" />
          <div className="auth-logo-line">
            <span className="auth-logo-foot">🩺</span>
            MVP de Psicologia • Design premium
          </div>
          <div className="auth-links">
            <a href="/privacy">Privacidade</a>
            <a href="/terms">Termos</a>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>Tentativas: {attempts}/5</span>
          </div>
        </div>

        <div className="auth-bottom">MVP Psicologia &nbsp;·&nbsp; © 2026 Todos os direitos reservados</div>
      </div>

      {/* Modal de consentimento LGPD */}
      {consentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0a1c12] border border-[rgba(77,167,104,0.2)] shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[rgba(77,167,104,0.1)] border border-[rgba(77,167,104,0.2)] flex items-center justify-center flex-shrink-0">
                  <Shield size={18} className="text-[#4DA768]" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base leading-tight">Consentimento LGPD</h2>
                  <p className="text-[11px] text-[#6f917c]">Lei nº 13.709/2018 — Art. 8º</p>
                </div>
              </div>
              <button onClick={() => setConsentModal(null)} className="p-1.5 rounded-lg text-[#6f917c] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="text-sm text-[#9cbbaa] leading-relaxed space-y-2">
              <p>Ao continuar, você <strong className="text-white">autoriza</strong> o tratamento dos seus dados pessoais (nome, e-mail) para:</p>
              <ul className="list-disc list-inside space-y-1 text-[#8fa88f] pl-1">
                <li>Identificação e autenticação na plataforma</li>
                <li>Agendamento e gestão de atendimentos clínicos</li>
                <li>Comunicação sobre consultas e resultados</li>
              </ul>
              <p className="text-xs text-[#6f917c] pt-1">
                Base legal: <strong>Consentimento</strong> (Art. 7º, I). Você pode revogar a qualquer momento em <em>Configurações &rsaquo; Privacidade</em>.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConsentModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.04] text-[#9cbbaa] border border-[rgba(255,255,255,0.08)] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSocialLogin(consentModal)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#4DA768] text-[#052417] hover:brightness-110 transition-all"
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
