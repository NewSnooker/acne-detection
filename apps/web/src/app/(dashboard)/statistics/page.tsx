import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";

import { startOfDay, endOfDay, subDays } from "date-fns";

export const metadata = {
  title: "ภาพรวมของฉัน (My Overview)",
};

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireUserPage();

  const params = await searchParams;
  const startParam = params.start as string | undefined;
  const endParam = params.end as string | undefined;
  const isAll = params.all === "true";

  let dateFilter: any = undefined;
  if (!isAll && startParam && endParam) {
    let startDate = startOfDay(new Date(startParam));
    const endDate = endOfDay(new Date(endParam));

    // If "Today" (single day) is selected, expand start date by 1 day to show a trend line from yesterday
    if (startParam === endParam) {
      startDate = subDays(startDate, 1);
    }

    dateFilter = {
      gte: startDate,
      lte: endDate,
    };
  }

  // Fetch user's analysis history
  const analyses = await prisma.analysis.findMany({
    where: {
      userId: session.user.id,
      createdAt: dateFilter,
    },
    orderBy: {
      createdAt: "asc", // Oldest to newest for timeseries
    },
    select: {
      createdAt: true,
      total: true,
      severity: true,
      counts: true,
    },
  });

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="pb-8">
        <StatisticsDashboard data={analyses as any} />
      </div>
    </div>
  );
}
