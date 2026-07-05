import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import AISidebar from "@/components/AISidebar";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Clínica IA",
  description: "Gerenciamento de Consultas e Procedimentos",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#0b140c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${manrope.className} bg-[var(--background)] text-[var(--foreground)] antialiased flex h-dvh overflow-hidden app-premium-bg`}>
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--background)] pt-14 md:pt-0">
          {children}
        </main>
        <AISidebar />
      </body>
    </html>
  );
}
