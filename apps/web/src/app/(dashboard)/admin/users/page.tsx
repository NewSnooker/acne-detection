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
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex shrink-0 flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-center text-2xl font-bold tracking-tight sm:text-start">
            จัดการผู้ใช้งาน <br className="sm:hidden" />
            (User Management)
          </h1>
          <p className="text-muted-foreground mt-1 text-center sm:text-start">
            จัดการข้อมูลผู้ใช้งาน สิทธิ์การเข้าถึง และสถานะบัญชีภายในระบบ
          </p>
        </div>
      </div>

      <div className="min-h-[500px] flex-1">
        <UserTable users={users} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
