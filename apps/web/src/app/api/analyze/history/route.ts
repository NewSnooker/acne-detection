import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/guards";
import { deleteHistories } from "@/lib/services/history-service";

// รับได้ทั้ง { id } (ลบเดี่ยว) และ { ids } (ลบกลุ่ม)
const deleteSchema = z.union([
  z.object({ id: z.string().min(1) }),
  z.object({ ids: z.array(z.string().min(1)).min(1) }),
]);

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const ids = "id" in parsed.data ? [parsed.data.id] : parsed.data.ids;
    const deleted = await deleteHistories(ids);
    if (deleted === 0) {
      return NextResponse.json(
        { error: "ไม่พบประวัติที่ต้องการลบ" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API /api/analyze/history Error:", error);
    return NextResponse.json({ error: "ลบประวัติไม่สำเร็จ" }, { status: 500 });
  }
}
