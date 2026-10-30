"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModelService } from "@/lib/api-client/model-api";
import { Button } from "@/components/ui/button";
import { Edit, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AiModel } from "@prisma/client";
import { createPortal } from "react-dom";
import { MODEL_METRICS } from "@/types/analyze";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await ModelService.editModel(model.id, {
      name,
      version,
      description,
      ...metrics,
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
                    <fieldset>
                      <legend className="mb-1 text-sm font-medium">
                        ค่าประเมินโมเดล (%) — เว้นว่างได้
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
    </>
  );
}
