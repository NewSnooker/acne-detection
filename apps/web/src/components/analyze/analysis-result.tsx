import { useState } from "react";
import {
  AlertCircle,
  CircleCheck,
  Info,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  AnalysisResult,
  ACNE_COLORS,
  ACNE_LABELS,
  SEVERITY_LABELS,
  ACNE_CARE_ADVICE,
} from "@/types/analyze";
import { cn } from "@/lib/utils";
import { MedicalDisclaimer } from "./medical-disclaimer";
import { AcneGroupId, explainSeverity, SeverityLevel } from "@/lib/acne-groups";

interface AnalysisResultPanelProps {
  previewUrl: string | null;
  result: AnalysisResult | null;
  loading: boolean;
  loadingText?: string;
  progress?: number;
  error: string | null;
  onAnalyze: () => void;
  onUploadNew: () => void;
  readOnly?: boolean;
  /** true = ไม่แสดงข้อควรทราบในแผงนี้ (หน้าที่วางไว้ใต้รูปแทน) */
  hideDisclaimer?: boolean;
  isModelAvailable?: boolean;
  /** กลุ่มที่ผู้ใช้ชี้อยู่ (ใช้ร่วมกับ ImagePreview) */
  hoveredGroup?: AcneGroupId | null;
  onHoverGroup?: (group: AcneGroupId | null) => void;
}

// กลุ่มที่มีผลต่อการประเมิน: พื้นสีอ่อน + จุดสีตามระดับ (ไม่ใช้เส้นขอบ ให้การ์ดระดับเด่นที่สุด)
const DECISIVE_STYLE: Record<SeverityLevel, string> = {
  MILD: "bg-emerald-500/10",
  MODERATE: "bg-amber-500/10",
  SEVERE: "bg-destructive/10",
};

const DECISIVE_DOT: Record<SeverityLevel, string> = {
  MILD: "bg-emerald-500",
  MODERATE: "bg-amber-500",
  SEVERE: "bg-destructive",
};

// เกณฑ์ตามเล่มข้อ 1.3.3.5 (ตรงกับ calculateSeverity)
const SEVERITY_CRITERIA: { level: SeverityLevel; text: string }[] = [
  {
    level: "MILD",
    text: "ไม่อักเสบไม่เกิน 20 จุด และอักเสบตื้นไม่เกิน 5 จุด",
  },
  { level: "MODERATE", text: "ไม่อักเสบเกิน 20 จุด หรืออักเสบตื้น 6–20 จุด" },
  {
    level: "SEVERE",
    text: "อักเสบตื้นเกิน 20 จุด หรือพบอักเสบลึกตั้งแต่ 1 จุด",
  },
];

const PHOTO_TIPS = [
  "ถ่ายหน้าตรงในที่แสงสว่างพอ",
  "ไม่ใช้ฟิลเตอร์ และไม่แต่งหน้า",
  "ให้ผิวอยู่ในโฟกัส เห็นชัด ไม่เบลอ",
];

const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } },
};

export function AnalysisResultPanel({
  previewUrl,
  result,
  loading,
  loadingText = "กำลังประมวลผลด้วย AI...",
  progress = 0,
  error,
  onAnalyze,
  onUploadNew,
  readOnly = false,
  hideDisclaimer = false,
  isModelAvailable = true,
  hoveredGroup = null,
  onHoverGroup,
}: AnalysisResultPanelProps) {
  const [showCriteria, setShowCriteria] = useState(false);
  const explanation = result ? explainSeverity(result.counts) : null;
  return (
    <div className="bg-card relative overflow-hidden rounded-3xl border p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">สถานะการวิเคราะห์</h2>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-destructive/10 text-destructive mb-6 flex gap-3 rounded-lg p-4"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {!previewUrl && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isModelAvailable ? (
              <div className="flex flex-col gap-4">
                <p className="text-muted-foreground text-sm">
                  อัปโหลดรูปภาพเพื่อเริ่มต้น ถ่ายตามนี้จะได้ผลแม่นขึ้น
                </p>
                <ul className="flex flex-col gap-2 text-sm">
                  {PHOTO_TIPS.map((tip) => (
                    <li
                      key={tip}
                      className="bg-muted/50 flex items-start gap-2 rounded-xl px-3 py-2.5"
                    >
                      <CircleCheck
                        className="text-primary mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-destructive/10 text-destructive flex gap-3 rounded-lg p-4">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm">ระบบยังไม่พร้อมประมวลผล</p>
              </div>
            )}
          </motion.div>
        )}

        {previewUrl && !result && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {!error && (
              <p className="text-muted-foreground mb-4 text-sm">
                ระบบพร้อมทำการวิเคราะห์รูปภาพของคุณแล้ว
              </p>
            )}
            <motion.div className="space-y-4">
              <motion.button
                whileTap={!loading ? { scale: 0.98 } : {}}
                onClick={onAnalyze}
                className={cn(
                  "relative flex h-14 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl font-bold transition-all",
                  loading
                    ? "bg-secondary text-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50",
                )}
                disabled={loading}
              >
                {/* Gradient Progress Bar inside Button */}
                {loading && (
                  <div
                    className="from-primary/60 to-primary absolute top-0 bottom-0 left-0 overflow-hidden bg-gradient-to-r transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  >
                    {/* Continuous Shimmer Animation */}
                    <motion.div
                      className="absolute inset-0 w-[200%] -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        ease: "linear",
                      }}
                    />
                  </div>
                )}

                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center font-medium drop-shadow-sm",
                    loading ? "text-base text-white" : "text-lg",
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-white/90" />
                      <span className="min-w-[140px] text-left">
                        {loadingText}
                      </span>
                      <span className="ml-1 font-bold">
                        {Math.round(progress)}%
                      </span>
                    </>
                  ) : (
                    "วิเคราะห์รูปภาพ"
                  )}
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* ระดับความรุนแรง + จำนวน + เหตุผล */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className={cn(
                "space-y-2 rounded-xl p-4",
                result.total === 0
                  ? "bg-emerald-500/10"
                  : SEVERITY_LABELS[result.severity]?.bg || "bg-muted",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">
                    ระดับความรุนแรง
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      result.total === 0
                        ? "text-emerald-600"
                        : SEVERITY_LABELS[result.severity]?.color ||
                            "text-primary",
                    )}
                  >
                    {result.total === 0
                      ? "ไม่พบสิว"
                      : SEVERITY_LABELS[result.severity]?.label ||
                        result.severity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">พบทั้งหมด</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {result.total}{" "}
                    <span className="text-muted-foreground text-sm font-medium">
                      จุด
                    </span>
                  </p>
                </div>
              </div>
              {result.total > 0 && explanation && (
                <p className="text-sm leading-relaxed">{explanation.reason}</p>
              )}
            </motion.div>

            {result.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-muted/60 rounded-xl p-4"
              >
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Lightbulb
                    className="h-4 w-4 text-amber-500"
                    aria-hidden="true"
                  />
                  คำแนะนำการดูแลผิว
                </h3>
                <p className="text-foreground text-sm leading-relaxed">
                  {ACNE_CARE_ADVICE[result.severity] ||
                    "แนะนำให้ปรึกษาแพทย์ผู้เชี่ยวชาญด้านผิวหนัง"}
                </p>
              </motion.div>
            )}

            {result.total === 0 && (
              <div className="bg-muted/60 space-y-1 rounded-xl p-4">
                <p className="font-semibold">
                  ตรวจครบทั้ง 6 ชนิด ไม่พบสิวในภาพนี้
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ถ้าเห็นสิวแต่ระบบไม่พบ ลองถ่ายใหม่ในที่แสงสว่าง ไม่ย้อนแสง
                  และให้บริเวณที่มีสิวเต็มภาพมากขึ้น
                </p>
              </div>
            )}

            {explanation && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">แยกตามกลุ่มสิว</h3>
                  <button
                    type="button"
                    onClick={() => setShowCriteria((v) => !v)}
                    aria-expanded={showCriteria}
                    className="text-primary hover:bg-primary/5 flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm"
                  >
                    <Info className="h-4 w-4" aria-hidden="true" />
                    {showCriteria ? "ซ่อนเกณฑ์" : "ดูเกณฑ์ทั้งหมด"}
                  </button>
                </div>

                {showCriteria && (
                  <div className="overflow-hidden rounded-xl border text-sm">
                    <div className="bg-muted/50 text-muted-foreground grid grid-cols-[5.5rem_1fr] px-3 py-2 text-xs font-semibold">
                      <span>ระดับ</span>
                      <span>เกณฑ์</span>
                    </div>
                    {SEVERITY_CRITERIA.map((c) => (
                      <div
                        key={c.level}
                        className="grid grid-cols-[5.5rem_1fr] border-t px-3 py-2"
                      >
                        <span
                          className={cn(
                            "font-semibold",
                            SEVERITY_LABELS[c.level].color,
                          )}
                        >
                          {SEVERITY_LABELS[c.level].label}
                        </span>
                        <span className="text-muted-foreground">{c.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                <motion.div
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2.5"
                >
                  {explanation.groups.map((g) => (
                    <motion.section
                      key={g.id}
                      variants={listItemVariants}
                      onPointerEnter={() => onHoverGroup?.(g.id)}
                      onPointerLeave={() => onHoverGroup?.(null)}
                      className={cn(
                        "space-y-3 rounded-xl px-4 py-3.5 transition-[opacity,background-color]",
                        g.decisive ? DECISIVE_STYLE[g.level] : "bg-muted/40",
                        hoveredGroup === g.id && !g.decisive && "bg-muted/80",
                        hoveredGroup !== null &&
                          hoveredGroup !== g.id &&
                          "opacity-45",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="flex flex-wrap items-center gap-x-2">
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              g.decisive
                                ? DECISIVE_DOT[g.level]
                                : "bg-muted-foreground/30",
                            )}
                            aria-hidden="true"
                          />
                          <span className="font-bold">{g.name}</span>
                          <span className="text-muted-foreground text-xs">
                            (
                            {g.types
                              .map((t) =>
                                (ACNE_LABELS[t.type] ?? t.type).replace(
                                  /^สิว/,
                                  "",
                                ),
                              )
                              .join(" + ")}
                            )
                          </span>
                        </p>
                        <span className="shrink-0 text-lg font-bold tabular-nums">
                          {g.count}
                          <span className="text-muted-foreground ml-1 text-xs font-normal">
                            จุด
                          </span>
                        </span>
                      </div>
                      <div className="space-y-1.5 pl-4">
                        {g.types.map((t) => (
                          <div
                            key={t.type}
                            className={cn(
                              "flex items-center justify-between gap-3 text-sm",
                              t.count === 0 && "opacity-40",
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    ACNE_COLORS[t.type] || "#3b82f6",
                                }}
                              />
                              {ACNE_LABELS[t.type] ?? t.type}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {t.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.section>
                  ))}
                </motion.div>
              </div>
            )}

            {/* แสดงทุกครั้งที่มีผลวิเคราะห์ รวมถึงหน้าประวัติ */}
            {!hideDisclaimer && <MedicalDisclaimer className="mt-4" />}

            {!readOnly && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 pt-2"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onUploadNew}
                  className="border-primary text-primary hover:bg-primary/5 h-10 w-full cursor-pointer rounded-xl border-2 font-bold shadow-sm transition-colors"
                >
                  อัปโหลดรูปภาพใหม่
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
