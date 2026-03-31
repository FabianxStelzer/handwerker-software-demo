"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "./actions";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const result = await loginAction(formData);
      return result ?? null;
    },
    initialError ? { error: mapError(initialError) } : null
  );

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #212f46 0%, #354360 100%)",
        padding: "1rem",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-white.png" alt="Handwerk Voran" className="h-14 w-auto mb-4" />
          <p className="text-sm text-gray-300 mt-1">Melden Sie sich an</p>
        </div>

        <form
          action={formAction}
          className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          {state?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <p>{state.error}</p>
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

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Anmeldung..." : "Anmelden"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function mapError(code: string): string {
  if (code === "CredentialsSignin") return "Ungültige Anmeldedaten";
  if (code === "Configuration") return "Konfigurationsfehler. Bitte AUTH_SECRET und NEXTAUTH_URL prüfen.";
  return "Anmeldung fehlgeschlagen.";
}
