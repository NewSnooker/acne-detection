import { getAdminModels } from "@/server/models";
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
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex shrink-0 flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-center text-2xl font-bold tracking-tight sm:text-start">
            จัดการโมเดล AI <br className="sm:hidden" />
            (AI Model Management)
          </h1>
          <p className="text-muted-foreground mt-1 text-center sm:text-start">
            อัปโหลด จัดการ และกำหนดโมเดล AI ที่ใช้สำหรับตรวจจับและจำแนกชนิดสิว
          </p>
        </div>
        <UploadModelDialog isHosted={process.env.APP_ENV === "hosted"} />
      </div>

      <div className="min-h-[500px] flex-1">
        <ModelTable models={models} />
      </div>
    </div>
  );
}
