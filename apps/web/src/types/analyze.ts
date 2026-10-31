export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  type: string;
  confidence: number;
  bbox: BBox;
}
export interface AnalysisResult {
  id: string;
  imageName: string;
  imageUrl?: string | null;
  imageProvider?: string;
  detections: Detection[];
  counts: Record<string, number>;
  total: number;
  severity: "MILD" | "MODERATE" | "SEVERE";
}
export const ACCURACY_THRESHOLD = 0.25; // Default confidence for UI

export const ACNE_COLORS: Record<string, string> = {
  blackhead: "#6b7280", // gray-500
  whitehead: "#d1d5db", // gray-300
  papule: "#ef4444", // red-500
  pustule: "#eab308", // yellow-500
  nodule: "#b91c1c", // red-700
  cyst: "#7f1d1d", // red-900
  no_acne: "#10b981", // emerald-500
};

export const ACNE_LABELS: Record<string, string> = {
  blackhead: "สิวหัวดำ",
  whitehead: "สิวหัวขาว",
  papule: "สิวตุ่มแดง",
  pustule: "สิวหัวหนอง",
  nodule: "สิวก้อนแข็ง",
  cyst: "สิวซีสต์",
  no_acne: "หน้าใสไร้สิว",
};

// ค่าประเมินโมเดล (ข้อ 1.3.3.3) — key ตรงกับ field ใน AiModel, ค่าเป็นร้อยละ
export const MODEL_METRICS = [
  {
    key: "mAP50",
    label: "mAP@0.5",
    desc: "ความแม่นยำเฉลี่ยของการตรวจจับสิวทั้ง 6 ชนิด",
  },
  {
    key: "precision",
    label: "Precision",
    desc: "ที่ระบบบอกว่าเป็นสิว ถูกต้องจริงกี่เปอร์เซ็นต์",
  },
  {
    key: "recall",
    label: "Recall",
    desc: "สิวจริงทั้งหมด ระบบหาเจอกี่เปอร์เซ็นต์",
  },
  {
    key: "f1Score",
    label: "F1-score",
    desc: "ค่าสมดุลระหว่าง Precision และ Recall",
  },
  {
    key: "accuracy",
    label: "Type Accuracy",
    desc: "เมื่อพบสิวแล้ว ระบบบอกชนิดถูกกี่เปอร์เซ็นต์",
  },
] as const;
export type ModelMetricKey = (typeof MODEL_METRICS)[number]["key"];

export const ACNE_CARE_ADVICE: Record<string, string> = {
  MILD: "ระบบจะแนะนำการทำความสะอาดใบหน้าอย่างถูกวิธีด้วยผลิตภัณฑ์สูตรอ่อนโยน และแนะนำให้พิจารณาใช้ผลิตภัณฑ์เวชสำอาง (OTC) ที่มีส่วนผสมของกรดซาลิไซลิก (Salicylic Acid) เพื่อช่วยละลายสิ่งอุดตัน",
  MODERATE:
    "ระบบจะแนะนำให้หลีกเลี่ยงการสครับผิวหน้าและการใช้เครื่องสำอางที่ก่อให้เกิดการอุดตัน พร้อมทั้งแนะนำให้ปรึกษาเภสัชกรเพื่อเลือกใช้ยาทาที่มีฤทธิ์ต้านเชื้อแบคทีเรียและลดการอักเสบ เช่น เบนโซอิลเปอร์ออกไซด์ (Benzoyl Peroxide) หรือเรตินอยด์ชนิดทา (Topical Retinoids)",
  SEVERE:
    "⚠️ ระบบจะแจ้งเตือนถึงความเสี่ยงขั้นสูงสุดในการเกิดแผลเป็นแบบหลุม (Acne Scars) โดยจะเน้นย้ำให้ผู้ใช้งานหลีกเลี่ยงการบีบหรือกดสิวด้วยตนเองอย่างเด็ดขาด และแนะนำให้เข้าพบแพทย์ผิวหนัง (Dermatologist) โดยทันที เพื่อรับการรักษาที่เหมาะสม",
};

export const SEVERITY_LABELS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  MILD: {
    label: "เล็กน้อย",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  MODERATE: {
    label: "ปานกลาง",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  SEVERE: {
    label: "รุนแรง",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
};
