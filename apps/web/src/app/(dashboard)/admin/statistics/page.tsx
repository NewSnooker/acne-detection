import { requireAdminPage } from "@/lib/auth/guards";
import { getAdminStatistics } from "@/server/statistics";
import { AdminStatisticsDashboard } from "@/components/statistics/admin-statistics-dashboard";

export const metadata = {
  title: "ภาพรวมระบบ (System Overview)",
};

export default async function AdminStatisticsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminPage();

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

  const statisticsData = await getAdminStatistics(
    startDateStr,
    endDateStr,
    isAll,
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <AdminStatisticsDashboard data={statisticsData} />
    </div>
  );
}
