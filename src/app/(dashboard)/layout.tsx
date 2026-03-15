"use client";

import dynamic from "next/dynamic";

function DashboardLoading() {
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

const AppShell = dynamic(
  () => import("@/components/layout/app-shell").then((m) => ({ default: m.AppShell })),
  { ssr: false, loading: () => <DashboardLoading /> }
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
