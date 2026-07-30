import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";
import { Activity } from "lucide-react";

export const metadata = {
  title: "สถิติของฉัน - AcneAI",
};

export default async function StatisticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch user's analysis history
  const analyses = await prisma.analysis.findMany({
    where: {
      userId: session.user.id,
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
      <div className="">
        <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          สถิติของฉัน
        </h1>
        <p className="text-center sm:text-start text-muted-foreground mt-1">
          ติดตามแนวโน้มและพัฒนาการของปัญหาสิวของคุณผ่านกราฟแบบซูมได้
        </p>
      </div>

      <div className="pb-8">
        <StatisticsDashboard data={analyses as any} />
      </div>
    </div>
  );
}
