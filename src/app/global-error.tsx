"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            backgroundColor: "white",
            borderRadius: "0.75rem",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            border: "1px solid #e5e7eb",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111", marginBottom: "0.5rem" }}>
            Fehler
          </h1>
          <p style={{ color: "#4b5563", marginBottom: "1.5rem" }}>
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie, die Seite neu zu laden.
          </p>
          <button
            onClick={() => reset()}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: "#2563eb",
              color: "white",
              fontWeight: 500,
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
          <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#9ca3af" }}>
            Wenn das Problem weiterhin besteht, prüfen Sie die Browser-Konsole (F12) für Details.
          </p>
        </div>
      </body>
    </html>
  );
}
