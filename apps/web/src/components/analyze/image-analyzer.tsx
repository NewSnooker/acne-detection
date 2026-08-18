"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ImageUploader } from "./image-uploader";
import { ImagePreview } from "./image-preview";
import { AnalysisResultPanel } from "./analysis-result";
import { AnalysisResult } from "@/types/analyze";

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
  const progressRef = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setLoadingText("กำลังเริ่มต้น...");
    setError(null);
    setResult(null);

    // 1. Upload File via XHR to get real upload progress
    const formData = new FormData();
    formData.append("image", selectedFile);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/analyze/prepare", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        const scaledProgress = Math.round(percentComplete * 0.3); // Upload = 30%
        progressRef.current = scaledProgress;
        setProgress(scaledProgress);

        if (Math.round(percentComplete) % 25 === 0) {
          console.log(
            `[Status]: กำลังอัปโหลดรูปภาพ... (${Math.round(percentComplete)}%)`,
          );
        }
      }
    };

    xhr.onload = async () => {
      if (xhr.status !== 200) {
        setError("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
        setLoading(false);
        return;
      }

      try {
        const res = JSON.parse(xhr.responseText);
        if (res.error) throw new Error(res.error);

        const {
          imageUrlOrPath,
          modelUrlOrPath,
          imageName,
          imageUrl,
          imageProvider,
          modelId,
        } = res.data;

        // 2. Connect to WebSocket
        // const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl =
          process.env.NEXT_PUBLIC_AI_WS_URL || "ws://localhost:8000/ws/predict";

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              image_url: imageUrlOrPath,
              model_url: modelUrlOrPath,
              confidence: 0.2,
            }),
          );
        };

        let aiThinkingInterval: NodeJS.Timeout | null = null;

        ws.onmessage = async (event) => {
          const data = JSON.parse(event.data);

          if (data.error) {
            if (aiThinkingInterval) clearInterval(aiThinkingInterval);
            setError(data.error);
            setLoading(false);
            ws.close();
            return;
          }

          if (data.status === "PROCESSING") {
            const wsProgress = data.progress || 0;
            const scaledProgress = 30 + Math.round(wsProgress * 0.65);
            progressRef.current = scaledProgress;
            setProgress(scaledProgress);

            // Console log status for debugging
            console.log(`[Status]: ${data.message} (${wsProgress}%)`);

            if (
              data.message === "AI กำลังวิเคราะห์สิว..." &&
              !aiThinkingInterval
            ) {
              aiThinkingInterval = setInterval(() => {
                setProgress((prev) => {
                  if (prev < 95) return prev + 1;
                  return prev;
                });
              }, 400);
            }
          }

          if (data.status === "COMPLETED") {
            if (aiThinkingInterval) clearInterval(aiThinkingInterval);
            setProgress(98);
            console.log("[Status]: กำลังบันทึกผลลัพธ์ลงฐานข้อมูล...");

            // 3. Save result
            const { saveAnalysisResult } =
              await import("@/app/actions/save-analysis");
            const saveRes = await saveAnalysisResult({
              detections: data.result.detections,
              counts: data.result.counts,
              total: data.result.total,
              modelId,
              imageName,
              imageUrl,
              imageProvider,
            });

            if (saveRes.error) {
              setError(saveRes.error);
            } else {
              setResult(saveRes.data as AnalysisResult);
            }

            setProgress(100);
            setLoading(false);
            ws.close();
          }
        };

        ws.onerror = () => {
          if (aiThinkingInterval) clearInterval(aiThinkingInterval);
          setError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ AI");
          setLoading(false);
        };

        ws.onclose = (event) => {
          if (aiThinkingInterval) clearInterval(aiThinkingInterval);
          if (!event.wasClean && loading) {
            setError("การเชื่อมต่อขาดหาย (Connection Dropped)");
            setLoading(false);
          }
        };
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาด");
        setLoading(false);
      }
    };

    xhr.onerror = () => {
      setError("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
      setLoading(false);
    };

    xhr.send(formData);
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
        accept="image/*"
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
