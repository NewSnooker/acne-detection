import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminStatistics } from "@/lib/services/statistics-service";
import { AdminStatisticsDashboard } from "@/components/statistics/admin-statistics-dashboard";

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
  let startDateStr = searchParams?.start as string | undefined;
  const endDateStr = searchParams?.end as string | undefined;
  const isAll = searchParams?.all === "true";

  // If "Today" (single day) is selected, expand start date by 1 day to show a trend line from yesterday
  if (startDateStr && endDateStr && startDateStr === endDateStr) {
    const s = new Date(startDateStr);
    s.setDate(s.getDate() - 1);
    startDateStr = s.toISOString().split("T")[0];
  }

  const statisticsData = await getAdminStatistics(startDateStr, endDateStr, isAll);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <AdminStatisticsDashboard data={statisticsData} />
    </div>
  );
}
