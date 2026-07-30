import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAdminRoute() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/analyze");
  }
  return session;
}
export async function requireAuthRoute() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  return session;
}
