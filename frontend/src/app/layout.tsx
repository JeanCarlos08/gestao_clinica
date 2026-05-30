import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Home, ClipboardList, BarChart2, Upload, Settings, Bot, LogOut, FileText } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Clínica IA",
  description: "Gerenciamento de Consultas e Procedimentos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-[var(--background)] text-[var(--foreground)] antialiased flex h-screen overflow-hidden`}>
        {/* Sidebar */}
        <aside className="w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex flex-col justify-between flex-shrink-0 z-10">
          <div className="overflow-y-auto scrollbar-hide pb-4">
            {/* Logo */}
            <div className="p-5 flex items-center gap-3 border-b border-[var(--border)] mb-4">
              <div className="text-[var(--primary)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              </div>
              <span className="font-bold text-lg tracking-tight">Clínica IA</span>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center gap-3 px-5 mb-6">
              <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-black font-bold">
                <img src="https://i.pravatar.cc/150?img=5" alt="Avatar" className="rounded-full w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-sm font-semibold">Juliana Fetosa</div>
                <div className="text-xs text-[var(--primary)]">Administradora</div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="px-3 space-y-1">
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-label)] hover:text-white hover:bg-[var(--card)] transition-colors">
                <Home size={18} /> Dashboard
              </a>
              <a href="/atendimentos" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--primary)] bg-[var(--card)] border-l-4 border-[var(--primary)] font-medium">
                <ClipboardList size={18} /> Atendimentos
                <span className="ml-auto">›</span>
              </a>
              <a href="/laudos" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-label)] hover:text-white hover:bg-[var(--card)] transition-colors">
                <FileText size={18} /> Laudos
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-label)] hover:text-white hover:bg-[var(--card)] transition-colors">
                <BarChart2 size={18} /> Relatórios
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-label)] hover:text-white hover:bg-[var(--card)] transition-colors">
                <Upload size={18} /> Upload
              </a>
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-label)] hover:text-white hover:bg-[var(--card)] transition-colors mt-2">
                <Settings size={18} /> Configurações
              </a>
            </nav>

            {/* IA Box */}
            <div className="mx-4 mt-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="flex items-center gap-2 text-[var(--primary)] font-semibold text-sm mb-2">
                <Bot size={16} /> IA Assistente
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">Pergunte sobre seus dados...</p>
              <div className="relative">
                <input type="text" placeholder="Ex: Resumo de hoje" className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md py-2 pl-3 pr-8 text-xs text-white focus:outline-none focus:border-[var(--primary)]" />
                <button className="absolute right-2 top-2 text-[var(--primary)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[var(--border)]">
            <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
              <LogOut size={18} /> Encerrar sessão
            </button>
            <div className="mt-4 text-[10px] text-[var(--text-muted)] px-3">
              Clínica IA v2.0<br/>© 2025 - Todos os direitos reservados
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--background)]">
          {children}
        </main>
      </body>
    </html>
  );
}
