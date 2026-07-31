import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllHistory } from "@/lib/services/history-service";
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
  const session = await auth();

  // ตรวจสอบสิทธิ์ว่าต้องเป็น ADMIN เท่านั้น
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/analyze");
  }

  const params = await searchParams;

  // Always fetch a large limit (e.g. 10000) so HistoryGallery can handle client-side pagination
  const fetchLimit = 10000;
  const skip = 0;

  const sort = params.sort || "desc";
  const search = params.search;
  const date = params.date;
  const types = params.types ? params.types.split(",") : [];

  const { items, total, typeCounts } = await getAllHistory(
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
            ประวัติการวิเคราะห์ทั้งหมด<br className="sm:hidden" /> (All Analysis History)
          </h1>
          <p className="text-center sm:text-start text-muted-foreground mt-1">
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
