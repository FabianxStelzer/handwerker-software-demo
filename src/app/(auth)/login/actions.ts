"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Ungültige Anmeldedaten" };
        default:
          return { error: "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut." };
      }
    }
    // NEXT_REDIRECT wirft auch einen Error – den müssen wir weiterleiten
    throw error;
  }
}
