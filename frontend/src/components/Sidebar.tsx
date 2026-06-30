"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, ClipboardList, BarChart2, Upload, Settings, Bot, LogOut, FileText, Users,
  Menu, X, Sparkles
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
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({ displayName: "Usuário", role: "" });
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getLoggedUserProfile(token);
    setProfile({
      displayName: user.displayName,
      role: user.role,
    });
    // fetch clinic/user photo if available
    (async () => {
      try {
        if (!token) return;
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "/api") + "/configuracoes", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const photo = data.clinica.user_photo_base64 || data.clinica.clinic_logo_base64 || null;
        if (photo) setPhotoSrc(photo);
      } catch { /* ignore */ }
    })();
  }, []);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const navContent = (
    <>
      <div className="overflow-y-auto scrollbar-hide pb-4 flex-1">
        <div className="p-5 flex items-center gap-3 border-b border-[var(--border)] mb-4 bg-[linear-gradient(120deg,rgba(34,197,94,0.08),transparent_45%)]">
          <div className="text-[var(--primary)]">
            <Sparkles size={24} />
          </div>
          <span className="font-bold text-lg tracking-tight">Clínica IA</span>
        </div>

        <div className="flex items-center gap-3 px-5 mb-6">
          <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-black font-bold overflow-hidden flex-shrink-0">
            {photoSrc ? (
              <Image
                src={photoSrc}
                alt="avatar"
                width={40}
                height={40}
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm">
                {getUserInitials(profile.displayName)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{profile.displayName}</div>
            <div className="text-xs text-[var(--primary)]">{buildDisplayName(profile.role) || "Administradora"}</div>
          </div>
        </div>

        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(href)
                  ? "text-[var(--primary)] bg-[var(--card)] border-l-4 border-[var(--primary)] font-medium"
                  : "text-[var(--text-label)] hover:text-white hover:bg-[var(--card)]"
              }`}
            >
              <Icon size={18} /> {label}
              {isActive(href) && <span className="ml-auto">›</span>}
            </Link>
          ))}
        </nav>

        <div className="mx-4 mt-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-2 text-[var(--primary)] font-semibold text-sm mb-2">
            <Bot size={16} /> IA Assistente
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">Pergunte sobre seus dados...</p>
          <div className="relative">
            <input
              type="text"
              placeholder="Ex: Resumo de hoje"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md py-2 pl-3 pr-8 text-xs text-white focus:outline-none focus:border-[var(--primary)]"
            />
            <button className="absolute right-2 top-2 text-[var(--primary)]" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--border)] flex-shrink-0">
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
          <LogOut size={18} /> Encerrar sessão
        </button>
        <div className="mt-4 text-[10px] text-[var(--text-muted)] px-3">
          Clínica IA v2.0<br />© 2025 - Todos os direitos reservados
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--sidebar-bg)]/95 backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-[var(--text-label)] hover:text-white hover:bg-[var(--card)] transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--primary)]" />
          <span className="font-bold text-sm">Clínica IA</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — mobile drawer / desktop fixed */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border)]
          flex flex-col justify-between flex-shrink-0
          transform transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          md:top-0 top-0
        `}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--card)]"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
        {navContent}
      </aside>
    </>
  );
}
