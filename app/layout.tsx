import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raízes e Riquezas · Gestão de Projetos",
  description: "Plataforma integrada Raízes e Riquezas para gestão de projetos.",
  manifest: "/Projetos/manifest.json",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:bg-[#0c4a3e] focus:text-white focus:px-4 focus:py-2 focus:rounded-br-lg focus:top-0 focus:left-0">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
