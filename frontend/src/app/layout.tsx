import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
  themeColor: "#0ea5e9",
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
