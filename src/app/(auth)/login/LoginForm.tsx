"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [error, setError] = useState(() => {
    if (initialError === "CredentialsSignin") return "Ungültige Anmeldedaten";
    if (initialError === "Configuration") return "Konfigurationsfehler. Bitte AUTH_SECRET und NEXTAUTH_URL prüfen.";
    if (initialError) return "Anmeldung fehlgeschlagen.";
    return "";
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Ungültige Anmeldedaten");
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Anmeldung fehlgeschlagen.");
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
        padding: "1rem",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 mb-4">
            <Hammer className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Handwerker Software</h1>
          <p className="text-sm text-gray-500 mt-1">Melden Sie sich an</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <p>{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="E-Mail Adresse"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Anmeldung..." : "Anmelden"}
          </Button>
        </form>
      </div>
    </div>
  );
}
