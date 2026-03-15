"use server";

import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=CredentialsSignin");
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/",
  });
}
