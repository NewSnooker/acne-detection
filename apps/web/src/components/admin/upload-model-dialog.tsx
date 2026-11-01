"use client";

import { toast } from "sonner";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ModelService } from "@/lib/api-client/model-api";
import { Button } from "@/components/ui/button";

import {
  UploadCloud,
  FileType,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ไฟล์ใหญ่กว่านี้บนเว็บที่ deploy (Vercel + MongoDB Atlas ฟรี) จะเตือนก่อนอัปโหลด
const HOSTED_WARN_MB = 50;

export function UploadModelDialog({
  onSuccess,
  isHosted = false,
}: {
  onSuccess?: () => void;
  /** เว็บที่ deploy บน Vercel (APP_ENV=hosted) */
  isHosted?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFile(null);
    setName("");
    setVersion("");
    setDescription("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const selected = e.target.files?.[0];
    if (!selected) return;

    // ตรวจสอบนามสกุล
    if (!selected.name.endsWith(".pt")) {
      setError("กรุณาเลือกไฟล์ .pt (PyTorch Model) เท่านั้น");
      setFile(null);
      e.target.value = "";
      return;
    }

    setFile(selected);

    // Auto-fill ชื่อถ้ายังไม่ได้กรอก
    if (!name) setName(selected.name.replace(".pt", ""));
    if (!version) setVersion("1.0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("กรุณาเลือกไฟล์โมเดลก่อน");
      return;
    }
    if (!name || !version) {
      setError("กรุณากรอกชื่อและเวอร์ชันโมเดล");
      return;
    }

    setLoading(true);
    setError("");

    setProgress(0);
    const result = await ModelService.uploadModel(
      file,
      { name, version, description },
      setProgress,
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      resetForm();
      setIsOpen(false);
      toast.success("อัปโหลดโมเดลแล้ว กำลังอ่านค่าประเมินจากไฟล์...");
      router.refresh(); // อัปเดต UI หลังอัปโหลดโมเดลสำเร็จ
      if (onSuccess) onSuccess();

      // อ่านค่าประเมินจากผลเทรนในไฟล์ต่อเบื้องหลัง — อ่านไม่ได้ก็ไม่เป็นไร แอดมินกรอกเอง/กดดึงในหน้าแก้ไขได้
      const modelId = result.model?.id;
      if (modelId) {
        void ModelService.importMetrics(modelId).then((imported) => {
          if (!imported.error) router.refresh();
        });
      }
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
        <UploadCloud className="mr-1 h-4 w-4" />
        อัปโหลดโมเดล
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background animate-in fade-in zoom-in-95 w-full max-w-md overflow-hidden rounded-xl border shadow-xl duration-200">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">อัปโหลดโมเดล AI ใหม่</h2>
              <p className="text-muted-foreground text-sm">
                เฉพาะไฟล์ .pt จากการเทรน YOLO
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {/* File Upload Area */}
              <div
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                  file
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:bg-accent"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pt"
                  className="hidden"
                />

                {file ? (
                  <div className="text-center">
                    <CheckCircle2 className="text-primary mx-auto mb-2 h-10 w-10" />
                    <p className="max-w-[200px] truncate text-sm font-medium">
                      {file.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileType className="text-muted-foreground mx-auto mb-2 h-10 w-10" />
                    <p className="text-sm font-medium">
                      คลิกเพื่อเลือกไฟล์ .pt
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      ไม่จำกัดขนาด (ระบบแบ่งส่งทีละ 4 MB)
                    </p>
                  </div>
                )}
              </div>

              {isHosted && file && file.size > HOSTED_WARN_MB * 1024 * 1024 && (
                <div
                  role="note"
                  className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    ไฟล์ใหญ่กว่า {HOSTED_WARN_MB} MB:
                    เว็บนี้เก็บโมเดลในฐานข้อมูล (MongoDB Atlas ฟรีมีพื้นที่รวม
                    512 MB) และบริการ AI แบบฟรีอาจรันโมเดลใหญ่ไม่ไหวหรือช้ามาก
                    อัปโหลดได้ แต่ควรลบโมเดลเก่าที่ไม่ใช้
                  </span>
                </div>
              )}

              {loading && (
                <div className="space-y-1" role="status" aria-live="polite">
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full transition-[width] duration-300"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    อัปโหลดแล้ว {Math.round(progress * 100)}% —
                    อย่าปิดหน้านี้จนกว่าจะเสร็จ
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-destructive/15 text-destructive flex items-center gap-2 rounded-md p-3 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    ชื่อโมเดล
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="เช่น AcneYolo V1"
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
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    รายละเอียด (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="เพิ่มเมื่อ..., แก้ไข..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  disabled={loading}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer"
                  disabled={!file || loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "กำลังอัปโหลด..." : "บันทึกโมเดล"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
