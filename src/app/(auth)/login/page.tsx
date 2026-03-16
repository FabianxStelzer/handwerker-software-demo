"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Anmeldung..." : "Anmelden"}
    </Button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "CredentialsSignin") setError("Ungültige Anmeldedaten");
    else if (err) setError("Anmeldung fehlgeschlagen.");
  }, [searchParams]);

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
          action={async (formData) => {
            setError("");
            try {
              await loginAction(formData);
            } catch (err) {
              if (String(err).includes("NEXT_REDIRECT")) throw err;
              setError("Anmeldung fehlgeschlagen.");
            }
          }}
          className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 space-y-2">
              <p>{error}</p>
              <a
                href="/api/auth/debug-login"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs"
              >
                Login-Diagnose prüfen →
              </a>
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
              placeholder="admin@handwerker.de"
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

          <SubmitButton />
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Demo: admin@handwerker.de / admin123
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">
          <a href="/api/auth/debug-login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Login-Diagnose
          </a>
          {" · "}
          <a href="/api/auth/seed-admin" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Admin anlegen
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Lade…</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
