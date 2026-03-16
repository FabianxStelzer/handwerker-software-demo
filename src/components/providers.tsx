"use client";

import { SessionProvider } from "next-auth/react";
import { OfflineFetchProvider } from "./OfflineFetchProvider";
import { OfflineInit } from "./OfflineInit";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5}
      refetchOnWindowFocus={true}
    >
      <OfflineInit />
      <OfflineFetchProvider>{children}</OfflineFetchProvider>
    </SessionProvider>
  );
}
