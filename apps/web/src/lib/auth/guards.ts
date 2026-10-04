import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAdminRoute() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/analyze");
  }
  return session;
}
