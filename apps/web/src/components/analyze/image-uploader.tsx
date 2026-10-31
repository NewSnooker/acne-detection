import { useState } from "react";
import { UploadCloud, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MAX_IMAGE_SIZE_MB } from "@/lib/validation/image-file";

interface ImageUploaderProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isModelAvailable?: boolean;
}

export function ImageUploader({
  onFileSelect,
  fileInputRef,
  isModelAvailable = true,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!isModelAvailable) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isModelAvailable) return;
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isModelAvailable) return;
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // ส่งต่อทุกไฟล์ ให้ onFileSelect ตรวจชนิด/ขนาดและแจ้งข้อความเอง
      // Create a mock event to match the input signature
      const mockEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onFileSelect(mockEvent);
    }
  };

  if (!isModelAvailable) {
    return (
      <div className="border-destructive/50 bg-card flex min-h-[420px] flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 text-center transition-colors">
        <AlertTriangle className="text-destructive mb-4 h-16 w-16" />
        <h3 className="text-destructive text-xl font-bold">
          ระบบไม่พร้อมใช้งาน
        </h3>
        <p className="text-destructive/80 mb-6 font-semibold">
          ไม่มีโมเดลที่กำลังเปิดใช้งานอยู่ในระบบ
        </p>
      </div>
    );
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label="อัปโหลดรูปภาพใบหน้า"
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover="hover"
      initial="initial"
      animate={isDragging ? "hover" : "initial"}
      className={cn(
        "bg-card focus-visible:ring-ring flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-colors outline-none focus-visible:ring-2 sm:p-12",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-primary/25 hover:border-primary/60 hover:bg-primary/[0.03]",
      )}
    >
      <motion.div
        variants={{
          initial: { y: 0, scale: 1 },
          hover: { y: -6, scale: 1.05 },
        }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="bg-primary/10 text-primary ring-primary/5 mb-6 flex h-20 w-20 items-center justify-center rounded-full ring-8"
      >
        <UploadCloud className="h-9 w-9" aria-hidden="true" />
      </motion.div>
      <h3 className="mb-2 text-xl font-semibold">อัปโหลดรูปภาพใบหน้า</h3>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        ลากและวางรูปภาพที่นี่ หรือคลิกเพื่อเลือกไฟล์
      </p>
      <motion.span
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-7 py-2.5 text-sm font-semibold shadow-sm transition-colors"
      >
        เลือกไฟล์
      </motion.span>
      <div className="text-muted-foreground mt-6 flex flex-wrap justify-center gap-2 text-xs">
        {["JPEG", "PNG", `ไม่เกิน ${MAX_IMAGE_SIZE_MB} MB`].map((t) => (
          <span key={t} className="bg-muted rounded-full px-2.5 py-1">
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
