"use client";

import { useState } from "react";
import { editAiModel } from "@/app/actions/model-actions";
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

export function EditModelDialog({ model }: { model: AiModel }) {
  const [isOpen, setIsOpen] = useState(false);

  const [name, setName] = useState(model.name);
  const [version, setVersion] = useState(model.version);
  const [description, setDescription] = useState(model.description || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const data = {
      name,
      version,
      description,
    };

    const result = await editAiModel(model.id, data);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      setIsOpen(false);
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
              <div className="bg-background border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold">แก้ไขข้อมูลโมเดล</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          ชื่อโมเดล
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          เวอร์ชัน
                        </label>
                        <input
                          type="text"
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          required
                          className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        รายละเอียด (ถ้ามี)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-20 rounded-md border bg-background px-3 py-2 text-sm resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t">
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
