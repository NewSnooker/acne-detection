import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, format, endOfDay } from "date-fns";
import { th } from "date-fns/locale";

export async function getUserAnalytics(userId: string) {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, 6)); // Last 7 days

  const allAnalyses = await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  // Calculate total by severity
  const severityDistribution = {
    MILD: 0,
    MODERATE: 0,
    SEVERE: 0,
  };

  // Calculate acne types distribution
  const typeDistribution: Record<string, number> = {};

  // Calculate daily trend
  const trendMap = new Map();
  for (let i = 0; i <= 6; i++) {
    const d = subDays(endDate, 6 - i);
    trendMap.set(format(d, "dd MMM", { locale: th }), 0);
  }

  let totalAcne = 0;

  allAnalyses.forEach((analysis) => {
    // Severity
    if (analysis.severity) {
      severityDistribution[analysis.severity as keyof typeof severityDistribution]++;
    }

    // Types
    const counts = (analysis.counts as Record<string, number>) || {};
    Object.entries(counts).forEach(([type, count]) => {
      if (typeof count === "number" && count > 0) {
        typeDistribution[type] = (typeDistribution[type] || 0) + count;
        totalAcne += count;
      }
    });

    // Trend
    const dateStr = format(new Date(analysis.createdAt), "dd MMM", { locale: th });
    if (trendMap.has(dateStr)) {
      trendMap.set(dateStr, trendMap.get(dateStr) + 1);
    }
  });

  const dailyTrend = Array.from(trendMap, ([date, count]) => ({ date, count }));
  const topAcneTypes = Object.entries(typeDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  return {
    totalAnalyses: allAnalyses.length,
    totalAcne,
    severityDistribution,
    topAcneTypes,
    dailyTrend,
  };
}

export async function getAdminAnalytics() {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, 29)); // Last 30 days

  const [totalUsers, totalAnalyses, totalModels] = await Promise.all([
    prisma.user.count(),
    prisma.analysis.count(),
    prisma.aiModel.count(),
  ]);

  // Fetch last 30 days data for trends
  const analysesTrend = await prisma.analysis.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const trendMap = new Map();
  for (let i = 0; i <= 29; i++) {
    const d = subDays(endDate, 29 - i);
    trendMap.set(format(d, "dd MMM", { locale: th }), 0);
  }

  analysesTrend.forEach((analysis) => {
    const dateStr = format(new Date(analysis.createdAt), "dd MMM", { locale: th });
    if (trendMap.has(dateStr)) {
      trendMap.set(dateStr, trendMap.get(dateStr) + 1);
    }
  });

  const dailyTrend = Array.from(trendMap, ([date, count]) => ({ date, count }));

  // Get recent analyses for dashboard overview
  const recentAnalyses = await prisma.analysis.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true, image: true },
      },
    },
  });

  return {
    overview: {
      totalUsers,
      totalAnalyses,
      totalModels,
    },
    dailyTrend,
    recentAnalyses,
  };
}
