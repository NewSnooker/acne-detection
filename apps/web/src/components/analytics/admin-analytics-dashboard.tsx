"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Users, Activity, BrainCircuit } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

interface AdminAnalyticsDashboardProps {
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
  };
}

export function AdminAnalyticsDashboard({ data }: AdminAnalyticsDashboardProps) {
  const trendConfig = {
    analyses: {
      label: "การวิเคราะห์",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
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
        <Card className="col-span-5">
          <CardHeader>
            <CardTitle>แนวโน้มการใช้งานระบบ (30 วันล่าสุด)</CardTitle>
            <CardDescription>
              จำนวนครั้งการสแกนวิเคราะห์สิวของผู้ใช้งานทั้งหมดใน 30 วันที่ผ่านมา
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={trendConfig} className="h-[350px] w-full">
              <BarChart data={data.dailyTrend}>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="var(--color-analyses)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
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
          <CardContent className="flex-1 overflow-y-auto">
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
    </div>
  );
}
