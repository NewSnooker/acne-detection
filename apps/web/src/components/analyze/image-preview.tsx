import { useEffect, useRef } from "react";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { AnalysisResult, ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";

interface ImagePreviewProps {
  previewUrl: string;
  result: AnalysisResult | null;
  loading: boolean;
  onChangeImage?: () => void;
  readOnly?: boolean;
}

export function ImagePreview({
  previewUrl,
  result,
  loading,
  onChangeImage,
  readOnly = false,
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

        // Draw label background
        ctx.fillStyle = color;
        const fontSize = Math.max(12, image.naturalWidth / 40);
        ctx.font = `${fontSize}px sans-serif`;

        // 📌 หากต้องการให้แสดงเปอร์เซ็นต์ความมั่นใจ (%) บนกรอบด้วย
        // ให้คอมเมนต์บรรทัดข้างล่างนี้...
        const text = ACNE_LABELS[det.type] || det.type;

        // ... แล้วเปิดใช้งานบรรทัดนี้แทนครับ:
        // const text = `${ACNE_LABELS[det.type] || det.type} ${(det.confidence * 100).toFixed(0)}%`;

        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(x1, y1 - fontSize - 4, textWidth + 8, fontSize + 4);

        // Draw label text — สีพื้นอ่อน (หัวขาว/หัวหนอง) ต้องใช้ตัวอักษรเข้มจึงจะอ่านออก
        ctx.fillStyle = det.type === "whitehead" || det.type === "pustule" ? "#0f172a" : "#ffffff";
        ctx.fillText(text, x1 + 4, y1 - 4);
      });
    };
  }, [result, previewUrl]);

  return (
    <div className="bg-card group bg-muted/20 relative flex h-auto min-h-[250px] w-full items-center justify-center overflow-hidden rounded-2xl border shadow-sm lg:min-h-[400px]">
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
