import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#212f46",
};

export const metadata: Metadata = {
  title: "Handwerker Software",
  description: "Betriebssoftware für Handwerksunternehmen",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body
        className={`${inter.className} min-h-screen antialiased`}
        style={{ backgroundColor: "#f1f3f0" }}
        suppressHydrationWarning
      >
        <noscript>
          <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
            <p>JavaScript ist erforderlich. Bitte aktivieren Sie es.</p>
            <a href="/login" style={{ color: "#2563eb" }}>Zur Anmeldung</a>
          </div>
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
