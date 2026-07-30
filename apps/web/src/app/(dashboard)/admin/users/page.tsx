import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllUsers } from "@/lib/services/user-service";
import { UserTable } from "./user-table";
import { Users } from "lucide-react";

export const metadata = {
  title: "จัดการผู้ใช้งาน (Admin) - AcneAI",
};

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/analyze");
  }

  const users = await getAllUsers();

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-4 h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight ">
            จัดการผู้ใช้งาน
          </h1>
          <p className="text-center sm:text-start text-muted-foreground mt-1">
            ดูรายชื่อผู้ใช้งานในระบบ ค้นหา กรอง และลบบัญชีผู้ใช้ที่ไม่เหมาะสม
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[500px]">
        <UserTable users={users} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
