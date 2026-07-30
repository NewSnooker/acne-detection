import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserHistory } from "@/lib/services/history-service";
import { HistoryGallery } from "@/components/history/history-gallery";
import { History } from "lucide-react";

export const metadata = {
  title: "ประวัติการวิเคราะห์ - AcneAI",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    sort?: string;
    search?: string;
    date?: string;
    types?: string;
    view?: string;
  }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;

  // Always fetch a large limit (e.g. 10000) so HistoryGallery can handle client-side pagination
  const fetchLimit = 10000;
  const skip = 0;

  const sort = params.sort || "desc";
  const search = params.search;
  const date = params.date;
  const types = params.types ? params.types.split(",") : [];

  const { items, total, typeCounts } = await getUserHistory(
    session.user.id,
    fetchLimit,
    skip,
    sort,
    search,
    date,
    types,
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight ">
            ประวัติการวิเคราะห์
          </h1>
          <p className="text-center sm:text-start text-muted-foreground mt-1">
            ติดตามผลลัพธ์และพัฒนาการสุขภาพผิวหน้าของคุณ
          </p>
        </div>
      </div>
      <HistoryGallery
        items={items}
        totalItems={total}
        currentSort={sort}
        typeCounts={typeCounts}
      />
    </div>
  );
}
