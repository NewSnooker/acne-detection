"use client";

import { useState, useRef } from "react";
import { uploadAiModel } from "@/app/actions/model-actions";
import { Button } from "@/components/ui/button";

import {
  UploadCloud,
  FileType,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export function UploadModelDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
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

    // ตรวจสอบขนาด (จำกัด 100MB)
    if (selected.size > 100 * 1024 * 1024) {
      setError("ไฟล์มีขนาดใหญ่เกิน 100MB");
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

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("version", version);
    formData.append("description", description);

    const result = await uploadAiModel(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      resetForm();
      setIsOpen(false);
      if (onSuccess) onSuccess();
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
          <div className="bg-background border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">อัปโหลดโมเดล AI ใหม่</h2>
              <p className="text-sm text-muted-foreground">
                เฉพาะไฟล์ .pt จากการเทรน YOLO
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${
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
                    <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
                    <p className="font-medium text-sm truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileType className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="font-medium text-sm">
                      คลิกเพื่อเลือกไฟล์ .pt
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ขนาดสูงสุด 100MB
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    ชื่อโมเดล
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="เช่น AcneYolo V1"
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
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    รายละเอียด (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="เพิ่มเมื่อ..., แก้ไข..."
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
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
