import { requireUserPage } from "@/lib/auth/guards";
import { getUserHistory } from "@/lib/services/history-service";
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
