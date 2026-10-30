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
      <div className="border-destructive/50 bg-card flex h-[500px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors">
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
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover="hover"
      initial="initial"
      animate={isDragging ? "hover" : "initial"}
      className={cn(
        "flex h-[500px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:bg-muted/50 hover:border-primary/50",
      )}
    >
      <motion.div
        variants={{
          initial: { y: 0, scale: 1 },
          hover: { y: -10, scale: 1.1 },
        }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <UploadCloud
          className={cn(
            "mb-4 h-16 w-16 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground",
          )}
        />
      </motion.div>
      <h3 className="mb-2 text-xl font-medium">อัปโหลดรูปภาพใบหน้า</h3>
      <p className="text-muted-foreground mb-6">
        ลากและวางรูปภาพที่นี่ หรือคลิกเพื่อเลือกไฟล์ (รองรับ JPEG, PNG
        ขนาดไม่เกิน {MAX_IMAGE_SIZE_MB} MB)
      </p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer rounded-full px-6 py-2 font-medium shadow-sm transition-colors"
      >
        เลือกไฟล์
      </motion.button>
    </motion.div>
  );
}
