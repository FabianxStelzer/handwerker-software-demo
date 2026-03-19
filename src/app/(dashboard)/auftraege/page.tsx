"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuftraegePage() {
  const router = useRouter();
  useEffect(() => { router.replace("/projekte"); }, [router]);
  return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
