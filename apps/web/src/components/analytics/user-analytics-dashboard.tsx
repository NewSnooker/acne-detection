"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACNE_COLORS, ACNE_LABELS, SEVERITY_LABELS } from "@/types/analyze";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Activity, Droplets, Target, AlertTriangle } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface UserAnalyticsDashboardProps {
  data: {
    totalAnalyses: number;
    totalAcne: number;
    severityDistribution: {
      MILD: number;
      MODERATE: number;
      SEVERE: number;
    };
    topAcneTypes: { type: string; count: number }[];
    dailyTrend: { date: string; count: number }[];
  };
}

export function UserAnalyticsDashboard({ data }: UserAnalyticsDashboardProps) {
  // Chart Configs
  const trendConfig = {
    analyses: {
      label: "จำนวนการวิเคราะห์",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const severityData = [
    {
      name: SEVERITY_LABELS.MILD.label,
      value: data.severityDistribution.MILD,
      color: "#22c55e",
    },
    {
      name: SEVERITY_LABELS.MODERATE.label,
      value: data.severityDistribution.MODERATE,
      color: "#eab308",
    },
    {
      name: SEVERITY_LABELS.SEVERE.label,
      value: data.severityDistribution.SEVERE,
      color: "#ef4444",
    },
  ].filter((d) => d.value > 0);

  const severityConfig = {
    severity: {
      label: "ระดับความรุนแรง",
    },
  } satisfies ChartConfig;

  const acneTypesConfig = data.topAcneTypes.reduce((acc, curr) => {
    acc[curr.type] = {
      label: ACNE_LABELS[curr.type] || curr.type,
      color: ACNE_COLORS[curr.type] || "hsl(var(--primary))",
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              การวิเคราะห์ทั้งหมด
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAnalyses}</div>
            <p className="text-xs text-muted-foreground">ครั้งตลอดการใช้งาน</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สิวที่พบรวม</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAcne}</div>
            <p className="text-xs text-muted-foreground">จุดทั้งหมดที่ตรวจพบ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สิวที่พบบ่อยสุด</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.topAcneTypes.length > 0
                ? ACNE_LABELS[data.topAcneTypes[0].type] || data.topAcneTypes[0].type
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              ชนิดสิวที่มีแนวโน้มเกิดมากที่สุด
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ความรุนแรงหลัก</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.severityDistribution.SEVERE > data.severityDistribution.MODERATE
                ? "รุนแรง (Severe)"
                : data.severityDistribution.MODERATE > data.severityDistribution.MILD
                ? "ปานกลาง (Moderate)"
                : "เล็กน้อย (Mild)"}
            </div>
            <p className="text-xs text-muted-foreground">
              ระดับความรุนแรงส่วนใหญ่
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Trend Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>แนวโน้มการใช้งาน (7 วันล่าสุด)</CardTitle>
            <CardDescription>
              จำนวนครั้งที่คุณสแกนวิเคราะห์สิวในสัปดาห์ที่ผ่านมา
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={trendConfig} className="h-[300px] w-full">
              <LineChart data={data.dailyTrend}>
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
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-analyses)"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "var(--color-analyses)",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Severity Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>ระดับความรุนแรง</CardTitle>
            <CardDescription>
              สัดส่วนความรุนแรงของสิวจากการวิเคราะห์ทั้งหมด
            </CardDescription>
          </CardHeader>
          <CardContent>
            {severityData.length > 0 ? (
              <ChartContainer config={severityConfig} className="h-[300px] w-full">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} ครั้ง`,
                      name,
                    ]}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acne Types Bar Chart */}
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>ชนิดสิวที่พบทั้งหมด</CardTitle>
            <CardDescription>
              จำนวนสิวแต่ละประเภทที่ถูกตรวจพบจากทุกการวิเคราะห์
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topAcneTypes.length > 0 ? (
              <ChartContainer
                config={acneTypesConfig}
                className="h-[350px] w-full"
              >
                <BarChart data={data.topAcneTypes} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="type"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => ACNE_LABELS[value] || value}
                    fontSize={12}
                  />
                  <ChartTooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        const color = ACNE_COLORS[item.type];
                        const label = ACNE_LABELS[item.type] || item.type;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-sm" style={{ color }}>{label}</span>
                              <span className="text-xs text-muted-foreground">พบ {item.count} จุด</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                  >
                    {data.topAcneTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ACNE_COLORS[entry.type] || "hsl(var(--primary))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
