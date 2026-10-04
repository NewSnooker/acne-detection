import { AlertCircle, Loader2 } from "lucide-react";
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
  isModelAvailable?: boolean;
}

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
  isModelAvailable = true,
}: AnalysisResultPanelProps) {
  return (
    <div className="bg-card border rounded-2xl p-6 mt-2 mb-2 shadow-sm overflow-hidden relative">
      <h2 className="text-lg font-bold mb-4">สถานะการวิเคราะห์</h2>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-destructive/10 text-destructive p-4 rounded-lg flex gap-3 mb-6"
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
              <div className="text-center py-8 text-muted-foreground">
                กรุณาอัปโหลดรูปภาพเพื่อเริ่มต้น
              </div>
            ) : (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex gap-3">
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
              <p className="text-sm mb-4 text-muted-foreground">
                ระบบพร้อมทำการวิเคราะห์รูปภาพของคุณแล้ว
              </p>
            )}
            <motion.div className="space-y-4">
              <motion.button
                whileTap={!loading ? { scale: 0.98 } : {}}
                onClick={onAnalyze}
                className={cn(
                  "w-full cursor-pointer h-14 rounded-xl font-bold transition-all flex items-center justify-center relative overflow-hidden",
                  loading 
                    ? "bg-secondary text-foreground cursor-not-allowed" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50"
                )}
                disabled={loading}
              >
                {/* Gradient Progress Bar inside Button */}
                {loading && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out overflow-hidden"
                    style={{ width: `${progress}%` }}
                  >
                    {/* Continuous Shimmer Animation */}
                    <motion.div 
                      className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                    />
                  </div>
                )}

                <div className={cn(
                  "relative z-10 flex items-center justify-center font-medium drop-shadow-sm",
                  loading ? "text-white text-base" : "text-lg" 
                )}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-white/90" />
                      <span className="min-w-[140px] text-left">{loadingText}</span>
                      <span className="ml-1 font-bold">{Math.round(progress)}%</span>
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
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="bg-muted p-4 rounded-xl"
              >
                <p className="text-xs text-muted-foreground mb-1">
                  พบสิวทั้งหมด
                </p>
                <p className="text-3xl font-black text-primary">
                  {result.total}
                </p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className={cn(
                  "p-4 rounded-xl",
                  SEVERITY_LABELS[result.severity]?.bg || "bg-muted",
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  ระดับความรุนแรง
                </p>
                <p
                  className={cn(
                    "text-xl font-bold mt-1",
                    SEVERITY_LABELS[result.severity]?.color || "text-primary",
                  )}
                >
                  {SEVERITY_LABELS[result.severity]?.label || result.severity}
                </p>
              </motion.div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 border-b pb-2">
                สรุปตามประเภทสิว
              </h3>
              <motion.div
                variants={listContainerVariants}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {Object.entries(result.counts).map(([type, count]) => {
                  if (count === 0) return null;
                  const color = ACNE_COLORS[type] || "#3b82f6";
                  const label = ACNE_LABELS[type] || type;

                  return (
                    <motion.div
                      key={type}
                      variants={listItemVariants}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">
                          {label}{" "}
                          <span className="text-muted-foreground text-xs ml-1">
                            ({type})
                          </span>
                        </span>
                      </div>
                      <span className="font-bold">{count}</span>
                    </motion.div>
                  );
                })}

                {result.total === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center py-4 text-emerald-600 font-medium bg-emerald-50 rounded-lg"
                  >
                    ยอดเยี่ยม! ผิวหน้าของคุณดูสุขภาพดี
                  </motion.div>
                )}
              </motion.div>
            </div>

            {result.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-4"
              >
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-primary">
                  <span className="text-lg">💡</span> คำแนะนำการดูแลผิว
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {ACNE_CARE_ADVICE[result.severity] || "แนะนำให้ปรึกษาแพทย์ผู้เชี่ยวชาญด้านผิวหนัง"}
                </p>
              </motion.div>
            )}

            {/* แสดงทุกครั้งที่มีผลวิเคราะห์ รวมถึงหน้าประวัติ */}
            <MedicalDisclaimer className="mt-4" />

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
                  className="w-full cursor-pointer h-10 border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-colors shadow-sm"
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
