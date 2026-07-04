"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, ClipboardList, BarChart2, Upload, Settings, LogOut, FileText, Users,
  Menu, X, Sparkles,
} from "lucide-react";
import { buildDisplayName, getLoggedUserProfile, getUserInitials } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/atendimentos", label: "Atendimentos", icon: ClipboardList },
  { href: "/laudos", label: "Laudos", icon: FileText },
  { href: "/relatorios", label: "Relatórios", icon: BarChart2 },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
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
    (async () => {
      try {
        if (!token) return;
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/configuracoes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const photo = data.clinica.user_photo_base64 || data.clinica.clinic_logo_base64 || null;
        if (photo) setPhotoSrc(photo);
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
        <div className="relative px-5 py-5 border-b border-[var(--border)] mb-2 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,197,94,0.07)_0%,transparent_55%)] pointer-events-none" />
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[var(--primary)] opacity-[0.04] blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#052e16] border border-[rgba(74,222,128,0.2)] flex items-center justify-center shadow-[0_0_16px_rgba(34,197,94,0.2)] flex-shrink-0">
              <Sparkles size={15} className="text-[#4ade80]" />
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight">Clínica IA</div>
              <div className="text-[10px] text-[var(--text-muted)] tracking-wide">Portal Administrativo</div>
            </div>
          </div>
        </div>

        {/* User profile */}
        <div className="mx-3 mb-4 mt-3 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#16a34a] to-[#052e16] flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0 border border-[rgba(74,222,128,0.15)] shadow-[0_0_12px_rgba(34,197,94,0.15)]">
            {photoSrc ? (
              <Image src={photoSrc} alt="avatar" width={36} height={36} unoptimized className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs">{getUserInitials(profile.displayName)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate leading-tight">{profile.displayName}</div>
            <div className="text-[11px] text-[var(--primary)] font-medium truncate">{buildDisplayName(profile.role) || "Administradora"}</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_6px_rgba(34,197,94,0.6)] flex-shrink-0" title="Online" />
        </div>

        {/* Nav label */}
        <div className="px-5 mb-2">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[1.5px]">Menu</span>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-[var(--primary-dim)] text-[var(--primary)] shadow-[0_0_0_1px_rgba(34,197,94,0.15)_inset]"
                    : "text-[var(--text-label)] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span className={`flex-shrink-0 transition-colors ${active ? "text-[var(--primary)]" : "text-[var(--text-muted)] group-hover:text-white"}`}>
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className="flex-1 truncate">{label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_6px_rgba(34,197,94,0.7)] flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-[var(--border)] p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-[var(--text-label)] hover:text-red-400 hover:bg-red-400/[0.06] rounded-xl transition-all duration-150"
        >
          <LogOut size={16} strokeWidth={2} />
          Encerrar sessão
        </button>
        <div className="mt-3 px-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] opacity-60" />
          <span className="text-[10px] text-[var(--text-muted)]">Clínica IA v2.0 &nbsp;·&nbsp; © 2025</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--sidebar-bg)]/90 backdrop-blur-xl border-b border-[var(--border)] flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl text-[var(--text-label)] hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--primary)]" />
          <span className="font-bold text-sm tracking-tight">Clínica IA</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
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

