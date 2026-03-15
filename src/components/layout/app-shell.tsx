"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { VoiceAssistantSafe } from "@/components/VoiceAssistantSafe";
import { useEffect, useState } from "react";

const LOADING_TIMEOUT_MS = 2000;

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-600">Lade…</p>
        <a
          href="/login"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <p className="text-gray-600 mb-2">Die Anmeldung dauert länger als erwartet.</p>
          <p className="text-sm text-gray-500 mb-4">Prüfen Sie AUTH_SECRET in .env und ob die Datenbank erreichbar ist.</p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zur Anmeldung
          </a>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Weiterleitung zur Anmeldung…</p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zur Anmeldung
          </a>
        </div>
      </div>
    );
  }

  const user = session?.user;
  const safeUser = user ? { name: user.name ?? "", email: (user as { email?: string }).email ?? "", role: (user as { role?: string }).role ?? "MITARBEITER" } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header
          user={safeUser}
          onSignOut={() => signOut({ callbackUrl: "/login" })}
        />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <VoiceAssistantSafe />
    </div>
  );
}
