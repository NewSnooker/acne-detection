import { requireUserPage } from "@/lib/auth/guards";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUserPage();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={session.user?.role as string} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={{
            name: session.user?.name,
            email: session.user?.email,
            image: session.user?.image,
            role: session.user?.role as string,
          }}
        />
        <main className="flex-1 scrollbar-thin overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
