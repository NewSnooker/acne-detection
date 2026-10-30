import { requireAdminPage } from "@/lib/auth/guards";
import { getHistory } from "@/server/history";
import { HistoryGallery } from "@/components/history/history-gallery";

export const metadata = {
  title: "ประวัติการวิเคราะห์ทั้งหมด (All Analysis History)",
};

export default async function AdminHistoryPage({
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
  await requireAdminPage();

  const params = await searchParams;

  const sort = params.sort || "desc";
  const search = params.search;
  const date = params.date;
  const types = params.types ? params.types.split(",") : [];

  const { items, total, typeCounts } = await getHistory({
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
            ประวัติการวิเคราะห์ทั้งหมด
            <br className="sm:hidden" /> (All Analysis History)
          </h1>
          <p className="text-muted-foreground mt-1 text-center sm:text-start">
            ตรวจสอบประวัติการวิเคราะห์สิวทั้งหมดของผู้ใช้งาน
            พร้อมรายละเอียดและผลลัพธ์ย้อนหลัง
          </p>
        </div>
      </div>
      <HistoryGallery
        items={items}
        totalItems={total}
        currentSort={sort}
        typeCounts={typeCounts}
        isAdminView={true}
      />
    </div>
  );
}
