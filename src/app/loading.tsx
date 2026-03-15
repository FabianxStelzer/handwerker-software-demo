export default function Loading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            margin: "0 auto",
            border: "4px solid #2563eb",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#4b5563" }}>Lade…</p>
        <a
          href="/login"
          style={{
            display: "inline-block",
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#2563eb",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: 500,
            borderRadius: "0.5rem",
            textDecoration: "none",
          }}
        >
          Direkt zur Anmeldung
        </a>
      </div>
    </div>
  );
}
