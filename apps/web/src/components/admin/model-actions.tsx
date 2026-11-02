"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Power, Trash2, Loader2, Sparkles } from "lucide-react";
import { ModelService } from "@/lib/api-client/model-api";
import { EditModelDialog } from "./edit-model-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AiModel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ModelActions({ model }: { model: AiModel }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeOpen, setActiveOpen] = useState(false);
  const [ttaOpen, setTtaOpen] = useState(false);
  const modelId = model.id;
  const isActive = model.isActive;

  const handleSetActive = async () => {
    if (isActive) return;
    setLoading(true);
    const res = await ModelService.toggleModelActive(modelId);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      setActiveOpen(false);
      toast.success("ตั้งเป็นโมเดลหลักแล้ว");
      router.refresh(); // อัปเดต UI หลังเปลี่ยนสถานะโมเดล
    }
  };

  const handleSetTta = async (enabled: boolean) => {
    setLoading(true);
    const res = await ModelService.setModelTta(modelId, enabled);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      setTtaOpen(false);
      toast.success(enabled ? "เปิดใช้ TTA แล้ว" : "ปิด TTA แล้ว");
      router.refresh();
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const res = await ModelService.deleteModel(modelId);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      setDeleteOpen(false);
      toast.success("ลบโมเดลแล้ว");
      router.refresh(); // อัปเดต UI หลังลบโมเดล
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {!isActive && (
        <AlertDialog open={activeOpen} onOpenChange={setActiveOpen}>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={loading}
                    variant="outline"
                    size="icon"
                    className="rounded-md hover:text-emerald-400"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>ใช้งานโมเดล</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการตั้งเป็นโมเดลหลัก</AlertDialogTitle>
              <AlertDialogDescription>
                คุณต้องการตั้งโมเดล{" "}
                <span className="text-foreground font-semibold">
                  {model.name}
                </span>{" "}
                ให้เป็นโมเดลหลักที่ใช้ในการวิเคราะห์ภาพใช่หรือไม่?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e: React.FormEvent) => {
                  e.preventDefault();
                  handleSetActive();
                }}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                ยืนยัน
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={ttaOpen} onOpenChange={setTtaOpen}>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={loading}
                variant="outline"
                size="icon"
                aria-pressed={model.useTta}
                aria-label={model.useTta ? "ปิด TTA" : "เปิดใช้ TTA"}
                className={cn(
                  "rounded-md hover:text-violet-500",
                  model.useTta &&
                    "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
                )}
                onClick={() =>
                  model.useTta ? handleSetTta(false) : setTtaOpen(true)
                }
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {model.useTta ? "TTA เปิดอยู่ (กดเพื่อปิด)" : "เปิดใช้ TTA"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการเปิดใช้ TTA</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  คุณต้องการเปิด Test-Time Augmentation ให้โมเดล{" "}
                  <span className="text-foreground font-semibold">
                    {model.name}
                  </span>{" "}
                  ใช่หรือไม่?
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <span className="text-foreground font-medium">
                      คืออะไร:
                    </span>{" "}
                    ระบบจะวิเคราะห์ภาพหลายขนาดและแบบพลิกภาพ แล้วรวมผลเข้าด้วยกัน
                  </li>
                  <li>
                    <span className="text-foreground font-medium">
                      ความแม่นยำ:
                    </span>{" "}
                    ไม่แน่นอน อาจเพิ่มหรือลดเล็กน้อย ขึ้นอยู่กับโมเดล
                  </li>
                  <li>
                    <span className="text-foreground font-medium">เวลา:</span>{" "}
                    วิเคราะห์ช้าลงประมาณ 2–3 เท่า
                  </li>
                  <li>
                    <span className="text-foreground font-medium">
                      ทรัพยากร:
                    </span>{" "}
                    ใช้ CPU/GPU และหน่วยความจำมากขึ้น เซิร์ฟเวอร์ที่ RAM
                    น้อยอาจล่ม
                  </li>
                  <li>ค่าประเมินที่แสดงในหน้านี้เป็นค่าที่วัดแบบไม่ใช้ TTA</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.FormEvent) => {
                e.preventDefault();
                handleSetTta(true);
              }}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              เปิดใช้ TTA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditModelDialog model={model} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <AlertDialogTrigger asChild>
                  {!isActive ? (
                    <Button
                      disabled={loading}
                      variant="outline"
                      size="icon"
                      className={`hover:text-destructive rounded-md`}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  ) : null}
                </AlertDialogTrigger>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isActive ? "ไม่สามารถลบโมเดลหลักได้" : "ลบโมเดล"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบโมเดล</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบโมเดล{" "}
              <span className="text-foreground font-semibold">
                {model.name}
              </span>{" "}
              ถาวร? ไฟล์ `.pt` ของโมเดลนี้จะถูกลบออกจากเครื่องเซิร์ฟเวอร์
              และไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.FormEvent) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบทิ้งถาวร
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
