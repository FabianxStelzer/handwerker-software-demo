import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardPage } from "./dashboard-page";

const AUTH_TIMEOUT_MS = 1500;

export default async function HomePage() {
  let session = null;
  try {
    session = await Promise.race([
      auth(),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)
      ),
    ]);
  } catch {
    session = null;
  }

  if (!session) {
    redirect("/login");
  }

  return <DashboardPage />;
}
