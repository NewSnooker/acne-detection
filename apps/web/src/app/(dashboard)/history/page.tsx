import { requireUserPage } from "@/lib/auth/guards";
import { getHistory } from "@/lib/services/history-service";
import { HistoryGallery } from "@/components/history/history-gallery";

export const metadata = {
  title: "ประวัติการวิเคราะห์ (My Analysis History)",
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
  const session = await requireUserPage();

  const params = await searchParams;

  const sort = params.sort || "desc";
  const search = params.search;
  const date = params.date;
  const types = params.types ? params.types.split(",") : [];

  const { items, total, typeCounts } = await getHistory({
    userId: session.user.id,
    sort,
    search,
    date,
    types,
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex shrink-0 flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-center text-2xl font-bold tracking-tight sm:text-start">
            ประวัติการวิเคราะห์ <br className="sm:hidden" />
            (Analysis History)
          </h1>
          <p className="text-muted-foreground mt-1 text-center sm:text-start">
            ดูประวัติการวิเคราะห์สิวที่ผ่านมา
            พร้อมรายละเอียดและผลลัพธ์ของแต่ละครั้ง
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
