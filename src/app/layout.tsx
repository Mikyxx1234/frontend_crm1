import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";

import { auth } from "@/lib/auth-public";
import "@/lib/auth-types";

import { Providers } from "./providers";
import "./globals.css";

/* Fontes via next/font: bundling local + preload + zero FOUT.
   - DM Sans   → body (via --font-sans-next)
   - Plus Jakarta Sans → display/headings (via --font-display-next)
   Mantemos os import @import url(...) em globals.css como fallback
   pra navegadores que não recebem o CSS dos chunks do Next em
   tempo de paint (paranoia útil em SSR + cache estale). */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans-next",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-display-next",
});

export const metadata: Metadata = {
  title: "EduIT CRM",
  description: "CRM para gestão de relacionamento com clientes",
  applicationName: "EduIT",
  // PWA / iOS standalone — quando instalado na home, abre fullscreen
  // com a barra de status preta translucida (Safari respeita "default"
  // mais "black-translucent": o conteudo passa por baixo da status bar
  // e aproveitamos o env(safe-area-inset-top) pra empurrar o conteudo).
  appleWebApp: {
    capable: true,
    title: "EduIT",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  // Manifest: gerado dinamicamente em /manifest.webmanifest pelo
  // arquivo app/manifest.ts. O Next 15 ja injeta o <link> automatico
  // via metadata API quando o arquivo esta presente — declaramos
  // aqui apenas para garantir override consistente.
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  },
};

/* Viewport mobile-first:
   - `width=device-width` + `initialScale=1` → escala correta no celular.
   - `viewportFit: "cover"` → usa safe-area do iPhone (notch/home indicator)
     com env(safe-area-inset-*); combinado com utilities `.pb-safe` etc.
   - `maximumScale=5` (não 1) → permite zoom acessibilidade.
   - `themeColor` agora é o azul-claro do mesh — combina com a barra
     de URL do Chrome Android quando o app está aberto. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#dde8f5",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${dmSans.variable} ${plusJakarta.variable}`}
      data-chat-theme="azul"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <body className="min-h-dvh font-sans antialiased">
        <Providers session={session}>{children}</Providers>
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              borderRadius: "22px",
              fontFamily: "var(--font-sans)",
              background: "var(--glass-bg-overlay)",
              backdropFilter: "var(--glass-blur)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
            },
          }}
        />
      </body>
    </html>
  );
}
