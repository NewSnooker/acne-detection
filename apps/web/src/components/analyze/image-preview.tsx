import { useEffect, useRef } from "react";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnalysisResult, ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";

const LIGHT_LABEL_TYPES = new Set(["whitehead", "pustule"]);

interface ImagePreviewProps {
  previewUrl: string;
  result: AnalysisResult | null;
  loading: boolean;
  onChangeImage?: () => void;
  readOnly?: boolean;
  // true = กรอบพอดีกับรูป ไม่จองความสูงขั้นต่ำ (ใช้ใน popup ประวัติ)
  fit?: boolean;
}

export function ImagePreview({
  previewUrl,
  result,
  loading,
  onChangeImage,
  readOnly = false,
  fit = false,
}: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!result || !previewUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new window.Image();
    image.src = previewUrl;
    image.onload = () => {
      // Set canvas size to match image intrinsic size
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      // Draw original image
      ctx.drawImage(image, 0, 0);

      // Draw bounding boxes
      result.detections.forEach((det) => {
        const { x1, y1, x2, y2 } = det.bbox;
        const w = x2 - x1;
        const h = y2 - y1;
        const color = ACNE_COLORS[det.type] || "#3b82f6";

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, image.naturalWidth / 300); // scale line width
        ctx.strokeRect(x1, y1, w, h);

        // ป้ายชื่อชนิดสิวภาษาไทย ใช้ฟอนต์เดียวกับหน้าเว็บ (มีฟอนต์ไทย)
        const fontSize = Math.max(12, image.naturalWidth / 40);
        const fontFamily = getComputedStyle(document.body).fontFamily;
        ctx.font = `600 ${fontSize}px ${fontFamily}`;
        ctx.textBaseline = "middle";

        // ถ้าต้องการแสดงความมั่นใจ (%) ด้วย ใช้:
        // const text = `${ACNE_LABELS[det.type] ?? det.type} ${(det.confidence * 100).toFixed(0)}%`;
        const text = ACNE_LABELS[det.type] ?? det.type;

        const padX = fontSize * 0.4;
        const labelH = fontSize * 1.5;
        const textWidth = ctx.measureText(text).width;
        // ป้ายอยู่เหนือกรอบ ถ้าชิดขอบบนให้ย้ายเข้าไปในกรอบแทน
        const labelY = y1 - labelH >= 0 ? y1 - labelH : y1;
        ctx.fillStyle = color;
        ctx.fillRect(x1, labelY, textWidth + padX * 2, labelH);

        // สีอ่อน (สิวหัวขาว, หัวหนอง) ใช้ตัวอักษรเข้มจึงจะอ่านออก
        ctx.fillStyle = LIGHT_LABEL_TYPES.has(det.type) ? "#0f172a" : "#ffffff";
        ctx.fillText(text, x1 + padX, labelY + labelH / 2);
      });
    };
  }, [result, previewUrl]);

  return (
    <div
      className={cn(
        "bg-card group relative flex h-auto w-full items-center justify-center overflow-hidden rounded-3xl border shadow-sm",
        !fit && "min-h-[250px] lg:min-h-[420px]",
      )}
    >
      {!result ? (
        <div className="relative flex h-full w-full justify-center p-2">
          <Image
            src={previewUrl}
            alt="Preview"
            className="h-auto max-h-[300px] w-auto max-w-full object-contain md:max-h-[500px]"
            width={500}
            height={500}
          />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="h-full max-h-[300px] w-full object-contain p-2 md:max-h-[500px]"
        />
      )}

      {!loading && !readOnly && (
        <button
          onClick={onChangeImage}
          className="bg-background/80 hover:bg-background absolute top-4 right-4 cursor-pointer rounded-full p-2 shadow-sm backdrop-blur-md transition-colors"
          title="เปลี่ยนรูปภาพ"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
