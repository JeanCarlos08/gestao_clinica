"use client";

import { memo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, ClipboardList, BarChart2, Upload, Settings, LogOut, FileText, Users,
  Menu, X, Sparkles, ChevronRight,
} from "lucide-react";
import { buildDisplayName, getLoggedUserProfile, getUserInitials } from "@/lib/auth";

const Clock = memo(function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);
  return <div className="text-[11px] font-semibold text-[var(--primary)]">{time}</div>;
});

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",    icon: Home,          color: "text-emerald-400" },
  { href: "/pacientes",     label: "Pacientes",    icon: Users,         color: "text-blue-400" },
  { href: "/atendimentos",  label: "Atendimentos", icon: ClipboardList, color: "text-violet-400" },
  { href: "/laudos",        label: "Laudos",       icon: FileText,      color: "text-amber-400" },
  { href: "/relatorios",    label: "Relatórios",   icon: BarChart2,     color: "text-cyan-400" },
  { href: "/upload",        label: "Upload",       icon: Upload,        color: "text-pink-400" },
  { href: "/configuracoes", label: "Configurações",icon: Settings,      color: "text-slate-400" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({ displayName: "Usuário", role: "" });
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getLoggedUserProfile(token);
    setProfile({ displayName: user.displayName, role: user.role });

    // Tenta carregar foto do cache local primeiro (evita request a cada navegação)
    const cached = localStorage.getItem("sidebar_photo_cache");
    const cachedTime = localStorage.getItem("sidebar_photo_time");
    const now = Date.now();
    if (cached && cachedTime && now - parseInt(cachedTime) < 300000) {
      setPhotoSrc(cached);
      return;
    }

    (async () => {
      try {
        if (!token) return;
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/configuracoes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const photo = data.clinica.user_photo_base64 || data.clinica.clinic_logo_base64 || null;
        if (photo) {
          setPhotoSrc(photo);
          localStorage.setItem("sidebar_photo_cache", photo);
          localStorage.setItem("sidebar_photo_time", now.toString());
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const navContent = (
    <>
      <div className="overflow-y-auto scrollbar-hide pb-4 flex-1 min-h-0">

        {/* Brand header */}
        <div className="relative px-5 py-5 border-b border-[var(--border)] mb-3 overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[var(--primary)] opacity-[0.05] blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(34,197,94,0.06)] to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#052e16] border border-[rgba(74,222,128,0.25)] flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.25)] flex-shrink-0">
              <Sparkles size={16} className="text-[#4ade80]" />
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight leading-tight">Clínica IA</div>
              <div className="text-[10px] text-[var(--text-muted)] tracking-wide">Portal Administrativo</div>
            </div>
            <div className="ml-auto flex flex-col items-end">
              <Clock />
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] pulse-green" />
                <span className="text-[9px] text-[var(--text-muted)]">online</span>
              </div>
            </div>
          </div>
        </div>

        {/* User profile */}
        <div className="mx-3 mb-4 p-3 rounded-xl bg-gradient-to-br from-[var(--card)] to-[rgba(8,15,9,0.8)] border border-[var(--border)] flex items-center gap-3 group hover:border-[var(--border-light)] transition-colors">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0 border-2 border-[rgba(74,222,128,0.15)] shadow-[0_0_16px_rgba(34,197,94,0.15)] relative">
            {photoSrc ? (
              <Image src={photoSrc} alt="avatar" width={40} height={40} unoptimized className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#16a34a] to-[#052e16] flex items-center justify-center">
                <span className="text-xs font-bold">{getUserInitials(profile.displayName)}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate leading-tight">{profile.displayName}</div>
            <div className="text-[11px] text-[var(--primary)] font-medium truncate opacity-80">
              {buildDisplayName(profile.role) || "Administradora"}
            </div>
          </div>
          <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>

        {/* Nav label */}
        <div className="px-5 mb-2">
          <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[2px]">Navegação</span>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, color }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${
                  active
                    ? "bg-gradient-to-r from-[var(--primary-dim)] to-[rgba(34,197,94,0.06)] text-white shadow-[0_0_0_1px_rgba(34,197,94,0.15)_inset]"
                    : "text-[var(--text-label)] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {/* Active left accent */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-[var(--primary)] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                )}

                <span className={`flex-shrink-0 transition-all duration-200 ${active ? color : "text-[var(--text-muted)] group-hover:text-white"}`}>
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className="flex-1 truncate">{label}</span>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_6px_rgba(34,197,94,0.8)] flex-shrink-0 pulse-green" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-[var(--border)] p-3 space-y-1">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-[var(--text-label)] hover:text-red-400 hover:bg-red-500/[0.06] rounded-xl transition-all duration-150 group"
        >
          <LogOut size={15} strokeWidth={2} className="group-hover:rotate-12 transition-transform duration-200" />
          Encerrar sessão
        </button>
        <div className="px-3 flex items-center gap-2 pt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] opacity-40" />
          <span className="text-[9px] text-[var(--text-muted)]">Clínica IA v3.0.0 · © 2025</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/privacy" className="text-[9px] text-[var(--text-muted)] hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[9px] text-[var(--text-muted)] hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--sidebar-bg)]/95 backdrop-blur-xl border-b border-[var(--border)] flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl text-[var(--text-label)] hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#16a34a] to-[#052e16] flex items-center justify-center">
            <Sparkles size={12} className="text-[#4ade80]" />
          </div>
          <span className="font-bold text-sm tracking-tight gradient-text">Clínica IA</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-60 flex-shrink-0 flex flex-col
          bg-[var(--sidebar-bg)] border-r border-[var(--border)]
          transform transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="md:hidden absolute top-3 right-3 p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] z-10"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
        {navContent}
      </aside>
    </>
  );
}
