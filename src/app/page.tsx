import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardPage } from "./dashboard-page";

export default async function HomePage() {
  let session = null;
  try {
    session = await auth();
  } catch (err) {
    console.error("[HomePage] auth() error:", err);
    session = null;
  }

  if (!session?.user) {
    redirect("/login");
  }

  return <DashboardPage />;
}
