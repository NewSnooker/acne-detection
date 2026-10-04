"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { AnalyzeService } from "@/services/analyze-service";
import { ImageUploader } from "./image-uploader";
import { ImagePreview } from "./image-preview";
import { AnalysisResultPanel } from "./analysis-result";
import { AnalysisResult } from "@/types/analyze";
import { IMAGE_ACCEPT, validateImageFile } from "@/lib/validation/image-file";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

interface ImageAnalyzerProps {
  isModelAvailable?: boolean;
}

export function ImageAnalyzer({
  isModelAvailable = true,
}: ImageAnalyzerProps = {}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loadingText, setLoadingText] = useState<string>("กำลังเตรียมการ...");
  const [progress, setProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // รับเฉพาะ JPEG/PNG และจำกัดขนาด (ฝั่ง API ตรวจซ้ำอีกชั้น)
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setLoadingText("กำลังเชื่อมต่อระบบ AI...");
    setProgress(0);
    setError(null);
    setResult(null);

    // Simulate progress updates for long-running Cloudinary/YOLO tasks
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (prev < 40 ? 2 : prev < 70 ? 0.5 : 0.1);

        // Update text based on progress
        if (next < 30) setLoadingText("อัปโหลดรูปภาพ...");
        else if (next < 70) setLoadingText("AI กำลังวิเคราะห์...");
        else setLoadingText("ประมวลผลลัพธ์...");

        return next > 99 ? 99 : next;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await AnalyzeService.analyzeImage(formData);

      if (res.error) {
        clearInterval(progressInterval);
        setLoading(false);
        console.error(res.error);
        if (res.error.includes("fetch")) {
          setError("เกิดข้อผิดพลาดในการเชื่อมต่อ API");
        } else {
          setError(res.error);
        }
      } else {
        clearInterval(progressInterval);
        setProgress(100);
        setLoadingText("เสร็จสิ้น!");

        // ให้เวลาหลอดวิ่งไปแตะ 100% แว๊บนึง (300ms) แล้วค่อยโชว์ผลลัพธ์
        setTimeout(() => {
          setResult(res.data as AnalysisResult);
          setLoading(false);
        }, 300);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setLoading(false);
      setError(err.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const triggerUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={IMAGE_ACCEPT}
        onChange={handleFileSelect}
      />

      {/* Left: Image / Uploader */}
      <motion.div className="lg:col-span-2 space-y-4" variants={itemVariants}>
        <AnimatePresence mode="wait">
          {!previewUrl ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              transition={{ duration: 0.2 }}
            >
              <ImageUploader
                onFileSelect={handleFileSelect}
                fileInputRef={fileInputRef}
                isModelAvailable={isModelAvailable}
              />
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <ImagePreview
                previewUrl={previewUrl}
                result={result}
                loading={loading}
                onChangeImage={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Right: Actions & Results */}
      <motion.div className="space-y-6" variants={itemVariants}>
        <AnalysisResultPanel
          previewUrl={previewUrl}
          result={result}
          loading={loading}
          loadingText={loadingText}
          progress={progress}
          error={error}
          onAnalyze={handleAnalyze}
          onUploadNew={triggerUpload}
          isModelAvailable={isModelAvailable}
        />
      </motion.div>
    </motion.div>
  );
}
