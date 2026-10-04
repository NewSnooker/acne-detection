import { requireAdminPage } from "@/lib/auth/guards";
import { getAllUsers } from "@/lib/services/user-service";
import { UserTable } from "./user-table";

export const metadata = {
  title: "จัดการผู้ใช้งาน (User Management) - AcneAI",
};

export default async function AdminUsersPage() {
  const session = await requireAdminPage();

  const users = await getAllUsers();

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight ">
            จัดการผู้ใช้งาน <br className="sm:hidden" />(User Management)
          </h1>
          <p className="text-center sm:text-start text-muted-foreground mt-1">
            จัดการข้อมูลผู้ใช้งาน สิทธิ์การเข้าถึง และสถานะบัญชีภายในระบบ
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[500px]">
        <UserTable users={users} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
