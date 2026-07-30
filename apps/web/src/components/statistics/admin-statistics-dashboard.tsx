"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Users, Activity, BrainCircuit, Trophy } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { useGlobalFilter } from "@/components/statistics/global-filter-context";
import { SeverityDonutChart } from "@/components/statistics/severity-donut-chart";
import { AcneTypesChart } from "@/components/statistics/acne-types-chart";

interface AdminStatisticsDashboardProps {
  data: {
    overview: {
      totalUsers: number;
      totalAnalyses: number;
      totalModels: number;
    };
    dailyTrend: { date: string; count: number }[];
    recentAnalyses: {
      id: string;
      createdAt: Date;
      user: { name: string | null; email: string; image: string | null } | null;
    }[];
    severityDistribution: {
      MILD: number;
      MODERATE: number;
      SEVERE: number;
    };
    topAcneTypes: { type: string; count: number }[];
    topUsers: { name: string | null; email: string; image: string | null; scans: number }[];
  };
}

export function AdminStatisticsDashboard({ data }: AdminStatisticsDashboardProps) {
  const { dateRange } = useGlobalFilter();
  
  const trendConfig = {
    analyses: {
      label: "การวิเคราะห์",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  // Derive title suffix based on date range
  const dateSuffix = dateRange.from && dateRange.to 
    ? "ในช่วงเวลาที่เลือก" 
    : "(30 วันล่าสุด)";

  return (
    <div className="space-y-6">
      {/* Overview Cards (Always All-Time) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ผู้ใช้งานทั้งหมด</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">บัญชีในระบบทั้งหมด</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">การสแกนทั้งหมด</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalAnalyses}</div>
            <p className="text-xs text-muted-foreground">ครั้งตลอดการเปิดระบบ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Models</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalModels}</div>
            <p className="text-xs text-muted-foreground">โมเดลที่ถูกอัปโหลดในระบบ</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Trend Chart */}
        <Card className="col-span-5 flex flex-col">
          <CardHeader>
            <CardTitle>เทรนด์การใช้งานระบบรวม {dateSuffix}</CardTitle>
            <CardDescription>
              จำนวนครั้งการสแกนวิเคราะห์สิวของผู้ใช้งานทั้งหมดในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 flex-1 min-h-[350px]">
            <ChartContainer config={trendConfig} className="h-full w-full min-h-[350px]">
              <AreaChart data={data.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillAnalyses" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-analyses)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-analyses)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  allowDecimals={false}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area
                  dataKey="count"
                  type="natural"
                  fill="url(#fillAnalyses)"
                  fillOpacity={0.4}
                  stroke="var(--color-analyses)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>กิจกรรมล่าสุด</CardTitle>
            <CardDescription>
              การวิเคราะห์ที่เพิ่งเกิดขึ้นในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-[350px] max-h-[400px]">
            <div className="space-y-6">
              {data.recentAnalyses.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-10">
                  ไม่มีข้อมูลการสแกน
                </div>
              ) : (
                data.recentAnalyses.map((analysis) => (
                  <div key={analysis.id} className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-muted overflow-hidden relative shrink-0">
                      {analysis.user?.image ? (
                        <Image
                          src={analysis.user.image}
                          alt={analysis.user.name || "User"}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {(analysis.user?.name || analysis.user?.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <p className="text-sm font-medium truncate">
                        {analysis.user?.name || analysis.user?.email || "ผู้ใช้ไม่ระบุชื่อ"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        สแกนสิวเมื่อ {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true, locale: th })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Users */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> อันดับผู้ใช้งาน
            </CardTitle>
            <CardDescription>
              ผู้ใช้ที่สแกนสิวบ่อยที่สุด {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-6">
              {data.topUsers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-10">
                  ไม่มีข้อมูลผู้ใช้งาน
                </div>
              ) : (
                data.topUsers.slice(0, 5).map((user, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-6 font-bold text-muted-foreground">
                      {index + 1}.
                    </div>
                    <div className="h-9 w-9 rounded-full bg-muted overflow-hidden relative shrink-0">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name || "User"}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {(user.name || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden flex-1">
                      <p className="text-sm font-medium truncate">
                        {user.name || user.email || "ผู้ใช้ไม่ระบุชื่อ"}
                      </p>
                    </div>
                    <div className="font-bold text-primary text-sm">
                      {user.scans} ครั้ง
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Global Severity */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>สัดส่วนความรุนแรงรวม</CardTitle>
            <CardDescription>ภาพรวมระดับความรุนแรงของสิวทั้งระบบ {dateSuffix}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0 flex items-center justify-center min-h-[300px]">
            <SeverityDonutChart preAggregated={data.severityDistribution} />
          </CardContent>
        </Card>

        {/* Global Acne Types */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>ประเภทสิวที่พบมากที่สุด</CardTitle>
            <CardDescription>ภาพรวมสิวแต่ละประเภททั้งระบบ {dateSuffix}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <AcneTypesChart preAggregated={data.topAcneTypes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
