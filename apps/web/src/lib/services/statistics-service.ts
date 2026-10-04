import { prisma } from "@/lib/prisma";
import { startOfDay, format, endOfDay } from "date-fns";
import { th } from "date-fns/locale";

export async function getAdminStatistics(startDateStr?: string, endDateStr?: string, isAll?: boolean) {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (isAll) {
    startDate = undefined;
    endDate = undefined;
  } else if (startDateStr && endDateStr) {
    startDate = startOfDay(new Date(startDateStr));
    endDate = endOfDay(new Date(endDateStr));
  } else {
    // Default to All Time if nothing specified
    startDate = undefined;
    endDate = undefined;
  }

  const dateFilter = startDate && endDate ? {
    gte: startDate,
    lte: endDate,
  } : undefined;

  // Filter Overview
  const [totalUsers, totalAnalyses, totalModels] = await Promise.all([
    prisma.user.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
    prisma.analysis.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
    prisma.aiModel.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
  ]);

  // Fetch all users to compute accurate cumulative users
  const allUsers = await prisma.user.findMany({
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Fetch filtered analyses
  const filteredAnalyses = await prisma.analysis.findMany({
    where: {
      createdAt: dateFilter,
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
  
  let acneDetected = 0;
  let clearSkin = 0;

  interface TrendData {
    scans: number;
    formatted: string;
  }
  const trendMap = new Map<string, TrendData>();
  
  // If dateFilter is provided, build continuous trend map for the date range
  if (dateFilter && startDate && endDate) {
    let curr = new Date(startDate);
    let maxDays = 365; // Cap at 365 days
    while (curr <= endDate && maxDays > 0) {
      const key = format(curr, "yyyy-MM-dd");
      trendMap.set(key, { scans: 0, formatted: format(curr, "dd MMM", { locale: th }) });
      curr.setDate(curr.getDate() + 1);
      maxDays--;
    }
  }

  const userScanCounts = new Map<string, { user: any, count: number }>();

  filteredAnalyses.forEach((analysis) => {
    // Trend
    const key = format(new Date(analysis.createdAt), "yyyy-MM-dd");
    if (!trendMap.has(key)) {
      trendMap.set(key, { scans: 0, formatted: format(new Date(analysis.createdAt), "dd MMM", { locale: th }) });
    }
    const data = trendMap.get(key)!;
    data.scans++;

    // Severity
    if (analysis.severity) {
      severityDistribution[analysis.severity as keyof typeof severityDistribution]++;
    }

    // Types & Detection Results
    let totalAcneForScan = 0;
    const counts = (analysis.counts as Record<string, number>) || {};
    Object.entries(counts).forEach(([type, count]) => {
      if (typeof count === "number" && count > 0) {
        typeDistribution[type] = (typeDistribution[type] || 0) + count;
        totalAcneForScan += count;
      }
    });

    if (totalAcneForScan > 0) {
       acneDetected++;
    } else {
       clearSkin++;
    }

    // Top users
    if (analysis.userId) {
       if (!userScanCounts.has(analysis.userId)) {
          userScanCounts.set(analysis.userId, { user: analysis.user, count: 1 });
       } else {
          userScanCounts.get(analysis.userId)!.count++;
       }
    }
  });

  const dailyTrend = Array.from(trendMap, ([key, data]) => ({ date: data.formatted, count: data.scans, rawDate: key }));
  
  // Compute Growth Trend (New vs Existing)
  const growthMap = new Map<string, { newUsers: number, existingUsers: number, formatted: string }>();
  let cumulativeUsers = 0;
  
  // Initialize growthMap for the date range if filter exists, to ensure empty days are shown
  if (dateFilter && startDate && endDate) {
    let curr = new Date(startDate);
    let maxDays = 365;
    while (curr <= endDate && maxDays > 0) {
      const key = format(curr, "yyyy-MM-dd");
      growthMap.set(key, { newUsers: 0, existingUsers: 0, formatted: format(curr, "dd MMM", { locale: th }) });
      curr.setDate(curr.getDate() + 1);
      maxDays--;
    }
  }

  allUsers.forEach(user => {
    const key = format(new Date(user.createdAt), "yyyy-MM-dd");
    
    // If we have a filter, and this date is before the start date, it just adds to cumulative
    // If it's within the map, we update it
    if (growthMap.has(key)) {
      const data = growthMap.get(key)!;
      // We set existingUsers to the cumulative BEFORE adding this user, 
      // but wait, if 5 users join today, the existing is the accumulated until yesterday.
      // So existingUsers should be `cumulativeUsers` (which hasn't added this user yet).
      // But we must only set existingUsers ONCE per day to the starting cumulative of that day.
      if (data.newUsers === 0) {
        data.existingUsers = cumulativeUsers;
      }
      data.newUsers++;
    } else {
      // If we don't have a date filter (All Time), we need to add this date to the map
      if (!dateFilter) {
        growthMap.set(key, { 
          newUsers: 1, 
          existingUsers: cumulativeUsers, 
          formatted: format(new Date(user.createdAt), "dd MMM", { locale: th }) 
        });
      }
    }
    
    cumulativeUsers++;
  });

  // For days that had 0 new users, their existingUsers might still be 0 if we didn't set it.
  // We need to sweep through the map and carry over the existing users.
  let currentExisting = 0;
  const growthTrend = Array.from(growthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, data]) => {
      if (data.newUsers > 0) {
        currentExisting = data.existingUsers + data.newUsers;
        return {
          date: data.formatted,
          rawDate: key,
          newUsers: data.newUsers,
          existingUsers: data.existingUsers,
        };
      } else {
        // No new users today, so existing users is whatever it was yesterday
        return {
          date: data.formatted,
          rawDate: key,
          newUsers: 0,
          existingUsers: currentExisting,
        };
      }
    });

  // If there's a dateFilter, the first `currentExisting` might be 0 if no users joined.
  // We should actually calculate the exact cumulative users up to `startDate`.
  if (dateFilter && startDate) {
    const startTime = startOfDay(startDate).getTime();
    let initialExisting = 0;
    for (const u of allUsers) {
      if (new Date(u.createdAt).getTime() < startTime) {
        initialExisting++;
      } else {
        break; // allUsers is sorted
      }
    }
    
    let runningExisting = initialExisting;
    growthTrend.forEach(item => {
      if (item.newUsers === 0 && item.existingUsers === 0) {
        item.existingUsers = runningExisting;
      } else if (item.newUsers > 0) {
        item.existingUsers = runningExisting;
        runningExisting += item.newUsers;
      }
    });
  }

  const detectionResults = {
    ACNE: acneDetected,
    CLEAR: clearSkin,
  };
  
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
    growthTrend,
    recentAnalyses,
    severityDistribution,
    topAcneTypes,
    topUsers,
    detectionResults,
  };
}
