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
      <div className="flex shrink-0 flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="w-full sm:w-auto">
          <h1 className="text-center text-2xl font-bold tracking-tight sm:text-start">
            ภาพรวมระบบ <br className="sm:hidden" />
            (System Overview)
          </h1>
          <p className="text-muted-foreground mt-1 text-center sm:text-start">
            แสดงสถิติการใช้งาน ข้อมูลผู้ใช้ และผลการวิเคราะห์โดยรวมของระบบ
          </p>
        </div>
        <div className="flex w-full justify-center sm:w-auto sm:justify-end">
          <GlobalFilter />
        </div>
      </div>

      {/* Row 1: Overview Cards (1|1|1) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-card relative flex flex-col justify-center overflow-hidden rounded-2xl border p-5 shadow-sm">
          <div className="absolute top-4 right-4 opacity-10">
            <Users className="text-primary h-12 w-12" />
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <Users className="text-primary h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              ผู้ใช้งานหน้าใหม่
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {data.overview.totalUsers}
            </span>
            <span className="text-muted-foreground text-sm">บัญชี</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            บัญชีที่สมัคร {dateSuffix}
          </p>
        </div>

        <div className="bg-card relative flex flex-col justify-center overflow-hidden rounded-2xl border p-5 shadow-sm">
          <div className="absolute top-4 right-4 opacity-10">
            <ScanFace className="text-primary h-12 w-12" />
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <ScanFace className="text-primary h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              การสแกนทั้งหมด
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {data.overview.totalAnalyses}
            </span>
            <span className="text-muted-foreground text-sm">ครั้ง</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            ครั้ง {dateSuffix}
          </p>
        </div>

        <div className="bg-card relative flex flex-col justify-center overflow-hidden rounded-2xl border p-5 shadow-sm">
          <div className="absolute top-4 right-4 opacity-10">
            <BrainCircuit className="text-primary h-12 w-12" />
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <BrainCircuit className="text-primary h-4 w-4" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              AI Models
            </p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {data.overview.totalModels}
            </span>
            <span className="text-muted-foreground text-sm">โมเดล</span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            โมเดลถูกเพิ่ม {dateSuffix}
          </p>
        </div>
      </div>

      {/* Row 2: Growth & Top Users (2|1) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Growth Chart (Span 2) */}
        <Card className="col-span-1 flex flex-col md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">
              การเติบโตของฐานผู้ใช้งาน <br className="sm:hidden" />
              <span className="text-muted-foreground text-sm font-normal">
                (User Growth)
              </span>
            </CardTitle>
            <CardDescription>
              แสดงยอดผู้ใช้งานสะสมทั้งหมดในระบบ {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[350px] flex-1 pl-2">
            <AdminGrowthChart data={data.growthTrend} />
          </CardContent>
        </Card>

        {/* Top Users (Span 1) */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
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
                <div className="text-muted-foreground py-10 text-center text-sm">
                  ไม่มีข้อมูลผู้ใช้งาน
                </div>
              ) : (
                data.topUsers.slice(0, 10).map((user, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="text-muted-foreground flex w-6 items-center justify-center font-bold">
                      {index + 1}.
                    </div>
                    <div className="bg-muted relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name || "User"}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="bg-primary/20 text-primary flex h-full w-full items-center justify-center text-xs font-bold">
                          {(user.name || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <p className="truncate text-sm font-medium">
                        {user.name || user.email || "ผู้ใช้ไม่ระบุชื่อ"}
                      </p>
                    </div>
                    <div className="text-primary text-sm font-bold">
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Trend Chart (Span 2) */}
        <Card className="col-span-1 flex flex-col md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">
              สถิติการสแกนระบบรวม <br className="sm:hidden" />
              <span className="text-muted-foreground text-sm font-normal">
                (Total Scan Analysis)
              </span>
            </CardTitle>
            <CardDescription>
              จำนวนครั้งการสแกนวิเคราะห์สิวของผู้ใช้งานทั้งหมดในระบบ{" "}
              {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[350px] flex-1 pl-2">
            <AdminTrendChart data={data.dailyTrend} />
          </CardContent>
        </Card>

        {/* Recent Activity (Span 1) */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl">การวิเคราะห์ล่าสุด</CardTitle>
            <CardDescription>
              รายการการวิเคราะห์สิว 10 รายการล่าสุด {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[400px] min-h-[350px] flex-1 overflow-y-auto">
            <div className="space-y-6">
              {data.recentAnalyses.length === 0 ? (
                <div className="text-muted-foreground py-10 text-center text-sm">
                  ไม่มีข้อมูลการสแกน
                </div>
              ) : (
                data.recentAnalyses.slice(0, 10).map((analysis) => (
                  <div key={analysis.id} className="flex items-center gap-4">
                    <div className="bg-muted relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
                      {analysis.user?.image ? (
                        <Image
                          src={analysis.user.image}
                          alt={analysis.user.name || "User"}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="bg-primary/20 text-primary flex h-full w-full items-center justify-center text-xs font-bold">
                          {(analysis.user?.name || analysis.user?.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <p className="truncate text-sm font-medium">
                        {analysis.user?.name ||
                          analysis.user?.email ||
                          "ผู้ใช้ไม่ระบุชื่อ"}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
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
        <Card className="col-span-1 flex w-full flex-col">
          <CardHeader>
            <CardTitle className="text-xl">สัดส่วนผลการตรวจพบ</CardTitle>
            <CardDescription>
              สัดส่วนพบสิว vs หน้าใส {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[300px] w-full flex-1 items-center justify-center pb-0">
            <DetectionResultsChart data={data.detectionResults} />
          </CardContent>
        </Card>

        {/* Global Severity */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl">สัดส่วนความรุนแรงรวม</CardTitle>
            <CardDescription>
              ภาพรวมระดับความรุนแรงของสิวทั้งระบบ {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[300px] flex-1 items-center justify-center pb-0">
            <SeverityDonutChart preAggregated={data.severityDistribution} />
          </CardContent>
        </Card>

        {/* Global Acne Types */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl">ประเภทสิวที่พบมากที่สุด</CardTitle>
            <CardDescription>
              ภาพรวมสิวแต่ละประเภททั้งระบบ {dateSuffix}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px] flex-1">
            <AcneTypesChart preAggregated={data.topAcneTypes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
