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
  detections: Detection[];
  counts: Record<string, number>;
  total: number;
  severity: "MILD" | "MODERATE" | "SEVERE";
}

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
  papule: "สิวอักเสบแดง",
  pustule: "สิวอักเสบมีหนอง",
  nodule: "สิวอักเสบก้อนลึก",
  cyst: "สิวซีสต์",
  no_acne: "หน้าใสไร้สิว",
};

export const SEVERITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  MILD: { label: "เล็กน้อย", color: "text-emerald-600", bg: "bg-emerald-500/10" },
  MODERATE: { label: "ปานกลาง", color: "text-amber-600", bg: "bg-amber-500/10" },
  SEVERE: { label: "รุนแรง", color: "text-destructive", bg: "bg-destructive/10" },
};
