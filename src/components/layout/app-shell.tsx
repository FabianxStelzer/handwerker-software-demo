"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { VoiceAssistantSafe } from "@/components/VoiceAssistantSafe";
import { OfflineBanner } from "@/offline";
import { LicenseReminder } from "./license-reminder";
import { useEffect, useState } from "react";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import type { Language } from "@/lib/i18n/translations";

const LOADING_TIMEOUT_MS = 2000;

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f1f3f0" }}>
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "#9eb552", borderTopColor: "transparent" }} />
        <p className="mt-4 text-sm text-gray-600">Lade…</p>
        <a
          href="/login"
          className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#9eb552" }}
        >
          Zur Anmeldung
        </a>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [mounted, status, router]);

  useEffect(() => {
    if (!mounted || status !== "loading") return;
    const t = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [mounted, status]);

  if (!mounted) {
    return <LoadingFallback />;
  }

  if (status === "loading" && !loadingTimedOut) {
    return <LoadingFallback />;
  }

  if (status === "loading" && loadingTimedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f1f3f0" }}>
        <div className="text-center max-w-sm">
          <p className="text-gray-600 mb-2">Die Anmeldung dauert länger als erwartet.</p>
          <p className="text-sm text-gray-500 mb-4">Prüfen Sie AUTH_SECRET in .env und ob die Datenbank erreichbar ist.</p>
          <a href="/login" className="inline-block px-4 py-2 text-white rounded-lg" style={{ backgroundColor: "#9eb552" }}>Zur Anmeldung</a>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f1f3f0" }}>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Weiterleitung zur Anmeldung…</p>
          <a href="/login" className="inline-block px-4 py-2 text-white rounded-lg" style={{ backgroundColor: "#9eb552" }}>Zur Anmeldung</a>
        </div>
      </div>
    );
  }

  const user = session?.user;
  const safeUser = user ? { name: user.name ?? "", email: (user as { email?: string }).email ?? "", role: (user as { role?: string }).role ?? "MITARBEITER" } : null;
  const userLang = ((user as Record<string, unknown>)?.language as Language) || "de";

  return (
    <LanguageProvider initialLanguage={userLang}>
      <div className="min-h-screen" style={{ backgroundColor: "#f1f3f0" }}>
        <Sidebar
          user={safeUser}
          onSignOut={() => signOut({ callbackUrl: "/login" })}
        />
        <div className="lg:pl-64">
          <Header />
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
        <VoiceAssistantSafe />
        <OfflineBanner />
        <LicenseReminder />
      </div>
    </LanguageProvider>
  );
}
