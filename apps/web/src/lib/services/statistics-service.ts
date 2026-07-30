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

export async function getAdminStatistics(startDateStr?: string, endDateStr?: string) {
  const endDate = endDateStr ? endOfDay(new Date(endDateStr)) : endOfDay(new Date());
  const startDate = startDateStr ? startOfDay(new Date(startDateStr)) : startOfDay(subDays(endDate, 29)); 

  // All-Time Overview
  const [totalUsers, totalAnalyses, totalModels] = await Promise.all([
    prisma.user.count(),
    prisma.analysis.count(),
    prisma.aiModel.count(),
  ]);

  // Fetch filtered analyses
  const filteredAnalyses = await prisma.analysis.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      user: {
        select: { name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const severityDistribution = {
    MILD: 0,
    MODERATE: 0,
    SEVERE: 0,
  };
  const typeDistribution: Record<string, number> = {};
  
  const trendMap = new Map();
  // Build continuous trend map for the date range
  let curr = new Date(startDate);
  // Cap at 90 days to prevent massive maps if user selects a huge range
  let maxDays = 90; 
  while (curr <= endDate && maxDays > 0) {
    trendMap.set(format(curr, "dd MMM", { locale: th }), 0);
    curr.setDate(curr.getDate() + 1);
    maxDays--;
  }

  const userScanCounts = new Map<string, { user: any, count: number }>();

  filteredAnalyses.forEach((analysis) => {
    // Trend
    const dateStr = format(new Date(analysis.createdAt), "dd MMM", { locale: th });
    if (trendMap.has(dateStr)) {
      trendMap.set(dateStr, trendMap.get(dateStr) + 1);
    } else if (maxDays === 0) {
       // If range is > 90 days, we might just map it if we really need to, but let's just add it dynamically
       trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1);
    }

    // Severity
    if (analysis.severity) {
      severityDistribution[analysis.severity as keyof typeof severityDistribution]++;
    }

    // Types
    const counts = (analysis.counts as Record<string, number>) || {};
    Object.entries(counts).forEach(([type, count]) => {
      if (typeof count === "number" && count > 0) {
        typeDistribution[type] = (typeDistribution[type] || 0) + count;
      }
    });

    // Top users
    if (analysis.userId) {
       if (!userScanCounts.has(analysis.userId)) {
          userScanCounts.set(analysis.userId, { user: analysis.user, count: 1 });
       } else {
          userScanCounts.get(analysis.userId)!.count++;
       }
    }
  });

  const dailyTrend = Array.from(trendMap, ([date, count]) => ({ date, count }));
  
  const topAcneTypes = Object.entries(typeDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  const topUsers = Array.from(userScanCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item) => ({ ...item.user, scans: item.count }));

  const recentAnalyses = filteredAnalyses.slice(-10).reverse().map(a => ({
     id: a.id,
     createdAt: a.createdAt,
     user: a.user,
  }));

  return {
    overview: {
      totalUsers,
      totalAnalyses,
      totalModels,
    },
    dailyTrend,
    recentAnalyses,
    severityDistribution,
    topAcneTypes,
    topUsers,
  };
}
