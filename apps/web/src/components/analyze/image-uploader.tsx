import { useState } from "react";
import { UploadCloud, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
    if (file && file.type.startsWith("image/")) {
      // Create a mock event to match the input signature
      const mockEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onFileSelect(mockEvent);
    }
  };

  if (!isModelAvailable) {
    return (
      <div className="border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-colors h-[500px] border-destructive/50 bg-card">
        <AlertTriangle className="h-16 w-16 mb-4 text-destructive" />
        <h3 className="text-xl font-bold text-destructive">
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
        "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors h-[500px]",
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
            "h-16 w-16 mb-4 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground",
          )}
        />
      </motion.div>
      <h3 className="text-xl font-medium mb-2">อัปโหลดรูปภาพใบหน้า</h3>
      <p className="text-muted-foreground mb-6">
        ลากและวางรูปภาพที่นี่ หรือคลิกเพื่อเลือกไฟล์ (รองรับ JPG, PNG)
      </p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-primary text-primary-foreground cursor-pointer px-6 py-2 rounded-full font-medium shadow-sm hover:bg-primary/80 transition-colors"
      >
        เลือกไฟล์
      </motion.button>
    </motion.div>
  );
}
