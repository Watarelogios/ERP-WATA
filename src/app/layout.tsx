import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

/*
 * Inter e a fonte da identidade WATA. `variable` alimenta o token --font-sans
 * declarado em globals.css.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WATA ERP",
    template: "%s · WATA ERP",
  },
  description: "Sistema de gestao de relogios da WATA.",
  // Sistema privado: nao deve ser indexado.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#303236",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
