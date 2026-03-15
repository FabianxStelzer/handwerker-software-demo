"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Fehler</h1>
        <p className="text-gray-600 mb-6">
          Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
        </p>
        <button
          onClick={reset}
          className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
