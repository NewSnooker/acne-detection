import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminStatistics } from "@/lib/services/statistics-service";
import { AdminStatisticsDashboard } from "@/components/statistics/admin-statistics-dashboard";
import { GlobalFilterProvider } from "@/components/statistics/global-filter-context";
import { GlobalFilter } from "@/components/statistics/global-filter";

export const metadata = {
  title: "สถิติผู้ใช้งานและระบบ - Admin - AcneAI",
};

export default async function AdminStatisticsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/analyze");
  }

  const searchParams = await props.searchParams;
  const startDateStr = searchParams?.start as string | undefined;
  const endDateStr = searchParams?.end as string | undefined;

  const statisticsData = await getAdminStatistics(startDateStr, endDateStr);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <GlobalFilterProvider>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight ">
              สถิติผู้ใช้งานและระบบ
            </h1>
            <p className="text-center sm:text-start text-muted-foreground mt-1">
              ดูสถิติการใช้งานของผู้ใช้ทั้งหมดและสถานะของระบบ
            </p>
          </div>
          <GlobalFilter />
        </div>
        <AdminStatisticsDashboard data={statisticsData} />
      </GlobalFilterProvider>
    </div>
  );
}
