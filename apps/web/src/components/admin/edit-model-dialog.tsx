"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModelService } from "@/lib/api-client/model-api";
import { Button } from "@/components/ui/button";
import { Edit, FileSearch, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AiModel } from "@prisma/client";
import { createPortal } from "react-dom";
import { MODEL_METRICS } from "@/types/analyze";
import {
  MAX_MODEL_CONFIDENCE,
  MIN_MODEL_CONFIDENCE,
} from "@/lib/validation/api-input";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function EditModelDialog({ model }: { model: AiModel }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const [name, setName] = useState(model.name);
  const [version, setVersion] = useState(model.version);
  const [description, setDescription] = useState(model.description || "");
  const [metrics, setMetrics] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      MODEL_METRICS.map(({ key }) => [key, model[key]?.toString() ?? ""]),
    ),
  );

  const [confidence, setConfidence] = useState(model.confidence.toString());
  const [useTta, setUseTta] = useState(model.useTta);
  const [ttaConfirmOpen, setTtaConfirmOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // อ่าน mAP@0.5, Precision, Recall, F1 จากผลเทรนในไฟล์ .pt (บันทึกลงฐานข้อมูลทันที)
  const handleImportMetrics = async () => {
    setImporting(true);
    setError("");
    setNotice("");
    const result = await ModelService.importMetrics(model.id);
    setImporting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const imported = result.metrics ?? {};
    setMetrics((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(imported)) {
        if (value !== undefined) next[key] = value.toString();
      }
      return next;
    });
    setNotice("ดึงค่าจากไฟล์โมเดลแล้ว (Type Accuracy ไม่มีในไฟล์ ต้องกรอกเอง)");
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await ModelService.editModel(model.id, {
      name,
      version,
      description,
      ...metrics,
      confidence: Number(confidence),
      useTta,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      setIsOpen(false);
      router.refresh(); // อัปเดต UI หลังแก้ไขโมเดล
    }
  };

  return (
    <>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(true)}
              variant="outline"
              size="icon"
              className="rounded-md"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>แก้ไขโมเดล</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-background animate-in fade-in zoom-in-95 w-full max-w-md overflow-hidden rounded-xl border text-left shadow-xl duration-200">
                <div className="border-b px-6 py-4">
                  <h2 className="text-lg font-semibold">แก้ไขข้อมูลโมเดล</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                  {error && <p className="text-destructive text-sm">{error}</p>}
                  {notice && (
                    <p className="text-muted-foreground text-sm" role="status">
                      {notice}
                    </p>
                  )}

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          ชื่อโมเดล
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="bg-background h-10 w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          เวอร์ชัน
                        </label>
                        <input
                          type="text"
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          required
                          className="bg-background h-10 w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        รายละเอียด (ถ้ามี)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-background h-20 w-full resize-none rounded-md border px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="model-confidence"
                          className="mb-1 block text-sm font-medium"
                        >
                          ความมั่นใจขั้นต่ำ
                        </label>
                        <input
                          id="model-confidence"
                          type="number"
                          min={MIN_MODEL_CONFIDENCE}
                          max={MAX_MODEL_CONFIDENCE}
                          step={0.01}
                          value={confidence}
                          onChange={(e) => setConfidence(e.target.value)}
                          required
                          aria-describedby="model-confidence-hint"
                          className="bg-background h-10 w-full rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <span
                          id="model-tta-label"
                          className="mb-1 block text-sm font-medium"
                        >
                          TTA
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={useTta}
                          aria-labelledby="model-tta-label"
                          onClick={() =>
                            useTta ? setUseTta(false) : setTtaConfirmOpen(true)
                          }
                          className="flex h-10 items-center gap-2 text-sm"
                        >
                          <span
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
                              useTta ? "bg-violet-500" : "bg-muted",
                            )}
                          >
                            <span
                              className={cn(
                                "bg-background absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow transition-transform",
                                useTta && "translate-x-5",
                              )}
                            />
                          </span>
                          {useTta ? "เปิด" : "ปิด"}
                        </button>
                      </div>
                      <p
                        id="model-confidence-hint"
                        className="text-muted-foreground col-span-2 text-xs"
                      >
                        กรอบที่โมเดลมั่นใจน้อยกว่าค่านี้จะไม่แสดง (0.05–0.95)
                        แนะนำใช้ค่าที่ F1 สูงสุดจากกราฟ F1-Confidence
                        ของโมเดลนี้
                      </p>
                    </div>
                    <fieldset>
                      <legend className="mb-1 flex w-full items-center justify-between gap-2 text-sm font-medium">
                        <span>ค่าประเมินโมเดล (%) — เว้นว่างได้</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleImportMetrics}
                          disabled={importing || loading}
                        >
                          {importing ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileSearch className="mr-1 h-3.5 w-3.5" />
                          )}
                          ดึงค่าจากไฟล์โมเดล
                        </Button>
                      </legend>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {MODEL_METRICS.map(({ key, label }) => (
                          <div key={key}>
                            <label
                              htmlFor={`metric-${key}`}
                              className="text-muted-foreground mb-1 block text-xs"
                            >
                              {label}
                            </label>
                            <input
                              id={`metric-${key}`}
                              type="number"
                              min={0}
                              max={100}
                              step="any"
                              value={metrics[key]}
                              onChange={(e) =>
                                setMetrics((m) => ({
                                  ...m,
                                  [key]: e.target.value,
                                }))
                              }
                              className="bg-background h-10 w-full rounded-md border px-3 py-2 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <div className="flex justify-end gap-3 border-t pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      disabled={loading}
                    >
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      บันทึก
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}

      <AlertDialog open={ttaConfirmOpen} onOpenChange={setTtaConfirmOpen}>
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
                    ระบบจะวิเคราะห์ภาพ 3 แบบ (ภาพเดิม, ย่อและพลิกภาพ, ย่อ)
                    แล้วเลือกกรอบที่มั่นใจที่สุด
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
                  <li>ค่าประเมินที่แสดงเป็นค่าที่วัดแบบไม่ใช้ TTA</li>
                </ul>
                <p>มีผลเมื่อกด บันทึก ในหน้าแก้ไขโมเดล</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => setUseTta(true)}>
              เปิดใช้ TTA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
