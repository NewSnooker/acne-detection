import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { MissingImage } from "@/components/ui/missing-image";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnalysisResult, ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";
import { AcneGroupId, groupOfType } from "@/lib/acne-groups";

const LIGHT_LABEL_TYPES = new Set(["whitehead", "pustule"]);

interface ImagePreviewProps {
  previewUrl: string;
  result: AnalysisResult | null;
  loading: boolean;
  onChangeImage?: () => void;
  readOnly?: boolean;
  // true = กรอบพอดีกับรูป ไม่จองความสูงขั้นต่ำ (ใช้ใน popup ประวัติ)
  fit?: boolean;
  /** กลุ่มที่ผู้ใช้ชี้อยู่ — กรอบกลุ่มอื่นจะจางลง */
  hoveredGroup?: AcneGroupId | null;
  /** ชี้ที่กรอบในรูป → แจ้งกลุ่มของกรอบนั้น (null = ไม่ได้ชี้กรอบไหน) */
  onHoverGroup?: (group: AcneGroupId | null) => void;
}

export function ImagePreview({
  previewUrl,
  result,
  loading,
  onChangeImage,
  readOnly = false,
  fit = false,
  hoveredGroup = null,
  onHoverGroup,
}: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // รูปโหลดไม่ได้ (ไฟล์หาย) — แสดงภาพแทนแทนกรอบว่าง
  const [broken, setBroken] = useState(false);

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // โหลดรูปครั้งเดียวต่อรูป แล้วค่อยวาดกรอบใหม่ทุกครั้งที่กลุ่มที่ชี้เปลี่ยน
  useEffect(() => {
    if (!result || !previewUrl) return;
    let cancelled = false;
    const image = new window.Image();
    image.onerror = () => {
      if (!cancelled) setBroken(true);
    };
    image.onload = () => {
      if (cancelled) return;
      setBroken(false);
      setLoadedImage(image);
    };
    image.src = previewUrl;
    return () => {
      cancelled = true;
    };
  }, [result, previewUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!result || !loadedImage || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = loadedImage.naturalWidth;
    canvas.height = loadedImage.naturalHeight;
    ctx.drawImage(loadedImage, 0, 0);

    const baseLine = Math.max(2, loadedImage.naturalWidth / 300);
    const fontSize = Math.max(11, loadedImage.naturalWidth / 70);
    const fontFamily = getComputedStyle(document.body).fontFamily;

    result.detections.forEach((det) => {
      const { x1, y1, x2, y2 } = det.bbox;
      const color = ACNE_COLORS[det.type] || "#3b82f6";
      const group = groupOfType(det.type);
      const dimmed = hoveredGroup !== null && group !== hoveredGroup;
      const emphasized = hoveredGroup !== null && group === hoveredGroup;

      ctx.globalAlpha = dimmed ? 0.15 : 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = emphasized ? baseLine * 1.6 : baseLine;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // ป้ายชื่อชนิดสิวภาษาไทย ใช้ฟอนต์เดียวกับหน้าเว็บ (มีฟอนต์ไทย)
      ctx.font = `600 ${fontSize}px ${fontFamily}`;
      ctx.textBaseline = "middle";
      // ไม่แสดงค่าความมั่นใจ (%) ให้ผู้ใช้ — ตกลงกันแล้วว่าจะทำให้กังวลโดยไม่จำเป็น
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
    ctx.globalAlpha = 1;
  }, [result, loadedImage, hoveredGroup]);

  // แปลงตำแหน่งเมาส์เป็นพิกัดบนรูป (canvas ใช้ object-contain + padding) แล้วหากรอบที่ชี้อยู่
  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!onHoverGroup || !result || !loadedImage) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const style = getComputedStyle(canvas);
    const padL = parseFloat(style.paddingLeft);
    const padT = parseFloat(style.paddingTop);
    const boxW = rect.width - padL - parseFloat(style.paddingRight);
    const boxH = rect.height - padT - parseFloat(style.paddingBottom);
    const imgW = loadedImage.naturalWidth;
    const imgH = loadedImage.naturalHeight;
    const scale = Math.min(boxW / imgW, boxH / imgH);
    const x =
      (e.clientX - rect.left - padL - (boxW - imgW * scale) / 2) / scale;
    const y = (e.clientY - rect.top - padT - (boxH - imgH * scale) / 2) / scale;

    // กรอบเล็กสุดที่ครอบจุดนั้น (กรอบซ้อนกันให้เลือกตัวที่เจาะจงที่สุด)
    let hit: AcneGroupId | null = null;
    let hitArea = Infinity;
    for (const det of result.detections) {
      const { x1, y1, x2, y2 } = det.bbox;
      const area = (x2 - x1) * (y2 - y1);
      if (x >= x1 && x <= x2 && y >= y1 && y <= y2 && area < hitArea) {
        hit = groupOfType(det.type);
        hitArea = area;
      }
    }
    if (hit !== hoveredGroup) onHoverGroup(hit);
  };

  return (
    <div
      className={cn(
        "bg-card group relative flex h-auto items-center justify-center overflow-hidden rounded-3xl border shadow-sm",
        fit
          ? "mx-auto w-fit max-w-full"
          : "min-h-[250px] w-full lg:min-h-[420px]",
      )}
    >
      {broken ? (
        <MissingImage className="aspect-[4/3] w-[40rem] max-w-full" />
      ) : !result ? (
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
          onPointerMove={handlePointerMove}
          onPointerLeave={() => onHoverGroup?.(null)}
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
