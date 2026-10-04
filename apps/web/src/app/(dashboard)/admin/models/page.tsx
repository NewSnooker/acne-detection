import { getAdminModels } from "@/lib/services/model-service";
import { requireAdminPage } from "@/lib/auth/guards";
import { UploadModelDialog } from "@/components/admin/upload-model-dialog";
import { ModelTable } from "./model-table";

export const metadata = {
  title: "จัดการโมเดล AI (AI Model Management)",
};

export default async function AdminModelsPage() {
  await requireAdminPage();
  const models = await getAdminModels();

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-center sm:text-start text-2xl font-bold tracking-tight ">
            จัดการโมเดล AI <br className="sm:hidden" />(AI Model Management)
          </h1>
          <p className="text-center sm:text-start text-muted-foreground mt-1">
            อัปโหลด จัดการ และกำหนดโมเดล AI ที่ใช้สำหรับตรวจจับและจำแนกชนิดสิว
          </p>
        </div>
        <UploadModelDialog />
      </div>

      <div className="flex-1 min-h-[500px]">
        <ModelTable models={models} />
      </div>
    </div>
  );
}
