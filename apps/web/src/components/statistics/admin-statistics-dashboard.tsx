"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, BrainCircuit, Trophy, ScanFace } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import { SeverityDonutChart } from "@/components/statistics/severity-donut-chart";
import { AcneTypesChart } from "@/components/statistics/acne-types-chart";
import { AdminTrendChart } from "@/components/statistics/admin-trend-chart";
import { AdminGrowthChart } from "@/components/statistics/admin-growth-chart";
import { DetectionResultsChart } from "@/components/statistics/detection-results-chart";
import { GlobalFilter } from "./global-filter";

interface AdminStatisticsDashboardProps {
  data: {
    overview: {
      totalUsers: number;
      totalAnalyses: number;
      totalModels: number;
    };
    dailyTrend: { date: string; count: number }[];
    growthTrend: { date: string; newUsers: number; existingUsers: number }[];
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
    topUsers: {
      name: string | null;
      email: string;
      image: string | null;
      scans: number;
    }[];
    detectionResults: {
      ACNE: number;
      CLEAR: number;
    };
  };
}

export function AdminStatisticsDashboard({
  data,
}: AdminStatisticsDashboardProps) {
  const searchParams = useSearchParams();
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const isAll = searchParams.get("all") === "true";

  let dateSuffix = "ตลอดการใช้งาน";
  if (start && end) {
    const today = new Date();
    const s = new Date(start);
    const diffDays = Math.round(
      (today.getTime() - s.getTime()) / (1000 * 3600 * 24),
    );

    if (diffDays === 0) dateSuffix = "ของวันนี้";
    else if (diffDays <= 7 && diffDays > 0) dateSuffix = "ใน 7 วันล่าสุด";
    else if (diffDays <= 30 && diffDays > 7) dateSuffix = "ใน 30 วันล่าสุด";
    else dateSuffix = "ในช่วงเวลาที่เลือก";
  } else if (!isAll) {
    dateSuffix = "ตลอดการใช้งาน"; // default
  }

  return (
    <div className="space-y-6">
      {/* Top Header and Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="w-full sm:w-auto">
          <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight ">
            ภาพรวมระบบ <br className="sm:hidden" />(System Overview)
          </h1>
          <p className="text-center sm:text-start text-muted-foreground mt-1">
            แสดงสถิติการใช้งาน ข้อมูลผู้ใช้ และผลการวิเคราะห์โดยรวมของระบบ
          </p>
        </div>
        <div className="w-full sm:w-auto flex justify-center sm:justify-end">
          <GlobalFilter />
        </div>
      </div>

      {/* Row 1: Overview Cards (1|1|1) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10">
            <Users className="w-12 h-12 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              ผู้ใช้งานหน้าใหม่
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {data.overview.totalUsers}
            </span>
            <span className="text-sm text-muted-foreground">บัญชี</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            บัญชีที่สมัคร {dateSuffix}
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10">
            <ScanFace className="w-12 h-12 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ScanFace className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              การสแกนทั้งหมด
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {data.overview.totalAnalyses}
            </span>
            <span className="text-sm text-muted-foreground">ครั้ง</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ครั้ง {dateSuffix}
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10">
            <BrainCircuit className="w-12 h-12 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BrainCircuit className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              AI Models
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {data.overview.totalModels}
            </span>
            <span className="text-sm text-muted-foreground">โมเดล</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            โมเดลถูกเพิ่ม {dateSuffix}
          </p>
        </div>
      </div>

      {/* Row 2: Growth & Top Users (2|1) */}
      <div className="grid gap-4 md:grid-cols-3 grid-cols-1">
        {/* Growth Chart (Span 2) */}
        <Card className="col-span-1 md:col-span-2 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle>การเติบโตของฐานผู้ใช้งาน (User Growth)</CardTitle>
            <CardDescription>
              แสดงยอดผู้ใช้งานสะสมทั้งหมดในระบบ {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 flex-1 min-h-[350px]">
            <AdminGrowthChart data={data.growthTrend} />
          </CardContent>
        </Card>

        {/* Top Users (Span 1) */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> อันดับผู้ใช้งาน
            </CardTitle>
            <CardDescription>
              รายชื่อ 10 อันดับผู้ใช้งานที่มีการใช้ระบบสแกนสิวบ่อยที่สุด{" "}
              {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-6">
              {data.topUsers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-10">
                  ไม่มีข้อมูลผู้ใช้งาน
                </div>
              ) : (
                data.topUsers.slice(0, 10).map((user, index) => (
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
      </div>

      {/* Row 3: Trend & Recent Activity (2|1) */}
      <div className="grid gap-4 md:grid-cols-3 grid-cols-1">
        {/* Trend Chart (Span 2) */}
        <Card className="col-span-1 md:col-span-2 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle>เทรนด์การสแกนระบบรวม</CardTitle>
            <CardDescription>
              จำนวนครั้งการสแกนวิเคราะห์สิวของผู้ใช้งานทั้งหมดในระบบ{" "}
              {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 flex-1 min-h-[350px]">
            <AdminTrendChart data={data.dailyTrend} />
          </CardContent>
        </Card>

        {/* Recent Activity (Span 1) */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>การวิเคราะห์ล่าสุด</CardTitle>
            <CardDescription>
              รายการการวิเคราะห์สิว 10 รายการล่าสุดที่เพิ่งถูกใช้งานผ่านระบบ{" "}
              {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-[350px] max-h-[400px]">
            <div className="space-y-6">
              {data.recentAnalyses.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-10">
                  ไม่มีข้อมูลการสแกน
                </div>
              ) : (
                data.recentAnalyses.slice(0, 10).map((analysis) => (
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
                        {analysis.user?.name ||
                          analysis.user?.email ||
                          "ผู้ใช้ไม่ระบุชื่อ"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        สแกนสิวเมื่อ{" "}
                        {formatDistanceToNow(new Date(analysis.createdAt), {
                          addSuffix: true,
                          locale: th,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: AI Insights (1|1|1) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Detection Results */}
        <Card className="w-full col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>สัดส่วนผลการตรวจพบ</CardTitle>
            <CardDescription>
              สัดส่วนพบสิว vs หน้าใส {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 w-full pb-0 flex items-center justify-center min-h-[300px]">
            <DetectionResultsChart data={data.detectionResults} />
          </CardContent>
        </Card>

        {/* Global Severity */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>สัดส่วนความรุนแรงรวม</CardTitle>
            <CardDescription>
              ภาพรวมระดับความรุนแรงของสิวทั้งระบบ {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0 flex items-center justify-center min-h-[300px]">
            <SeverityDonutChart preAggregated={data.severityDistribution} />
          </CardContent>
        </Card>

        {/* Global Acne Types */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>ประเภทสิวที่พบมากที่สุด</CardTitle>
            <CardDescription>
              ภาพรวมสิวแต่ละประเภททั้งระบบ {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <AcneTypesChart preAggregated={data.topAcneTypes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
