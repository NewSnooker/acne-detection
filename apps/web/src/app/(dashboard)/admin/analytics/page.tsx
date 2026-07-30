import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminAnalytics } from "@/lib/services/analytics-service";
import { AdminAnalyticsDashboard } from "@/components/analytics/admin-analytics-dashboard";

export const metadata = {
  title: "สถิติผู้ใช้งานและระบบ - Admin - AcneAI",
};

export default async function AdminAnalyticsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/analyze");
  }

  const analyticsData = await getAdminAnalytics();

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-4 h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight ">
            สถิติผู้ใช้งานและระบบ
          </h1>
          <p className="text-center sm:text-start text-muted-foreground mt-1">
            ดูสถิติการใช้งานของผู้ใช้ทั้งหมดและสถานะของระบบ
          </p>
        </div>
      </div>
      <AdminAnalyticsDashboard data={analyticsData} />
    </div>
  );
}
