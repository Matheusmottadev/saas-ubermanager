import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Manrope,
  Sora,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-premium",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-title",
});

export const metadata: Metadata = {
  title: "Projeto Uber Store",
  description: "Landing page mobile-first para vender durante corridas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${bricolage.variable} ${spaceGrotesk.variable} ${sora.variable} ${manrope.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
