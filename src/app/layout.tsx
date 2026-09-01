import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageTransition from "@/components/PageTransition";
import dynamic from "next/dynamic";
import "./globals.css";

const AISidebar = dynamic(() => import("@/components/AISidebar"), { ssr: false, loading: () => null });

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
  preload: true,
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

export const metadata: Metadata = {
  title: "MVP Psicologia",
  description: "Prontuário, agenda e evoluções para psicólogos - MVP",
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
  themeColor: "#041214",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${inter.variable}`}>
      <body className={`font-sans bg-[var(--background)] text-[var(--foreground)] antialiased flex h-dvh overflow-hidden app-premium-bg`} style={{ fontFamily: "var(--font-inter), var(--font-manrope), system-ui, sans-serif" }}>
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--background)] pt-14 md:pt-0">
          <ToastProvider>
            <ErrorBoundary>
              <PageTransition>{children}</PageTransition>
            </ErrorBoundary>
          </ToastProvider>
        </main>
        <ErrorBoundary>
          <AISidebar />
        </ErrorBoundary>
      </body>
    </html>
  );
}
