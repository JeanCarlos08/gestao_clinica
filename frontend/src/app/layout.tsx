import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

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
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--background)] pt-14 md:pt-0">
          {children}
        </main>
      </body>
    </html>
  );
}
