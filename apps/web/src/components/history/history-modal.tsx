import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AnalysisResult } from "@/types/analyze";
import { ImagePreview } from "@/components/analyze/image-preview";
import { AnalysisResultPanel } from "@/components/analyze/analysis-result";
import { HistoryItem } from "./history-gallery";

interface HistoryModalProps {
  selectedItem: HistoryItem | null;
  selectedIndex: number | null;
  totalItems: number;
  isAdminView: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function HistoryModal({
  selectedItem,
  selectedIndex,
  totalItems,
  isAdminView,
  onClose,
  onNext,
  onPrev,
}: HistoryModalProps) {
  if (!selectedItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-12 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Navigation Controls (Desktop - Outside Image) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        disabled={selectedIndex === 0}
        className="hidden md:flex absolute cursor-pointer left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-background/20 text-white rounded-full hover:bg-background/40 backdrop-blur-md transition-all disabled:opacity-10 disabled:cursor-not-allowed z-50 items-center justify-center"
      >
        <ChevronLeft className="h-8 w-8" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        disabled={selectedIndex === totalItems - 1}
        className="hidden md:flex absolute cursor-pointer right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-background/20 text-white rounded-full hover:bg-background/40 backdrop-blur-md transition-all disabled:opacity-10 disabled:cursor-not-allowed z-50 items-center justify-center"
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      <div
        className="bg-card w-full max-w-6xl h-[90vh] md:h-full max-h-[800px] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-sm hidden sm:block">
              รายละเอียดการวิเคราะห์
            </h3>
            <h3 className="font-bold text-sm sm:hidden">ผลวิเคราะห์</h3>
            <span className="text-sm text-muted-foreground">
              {new Date(selectedItem.createdAt).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              น.
            </span>
            {isAdminView && selectedItem.user && (
              <>
                <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-border mx-1"></span>
                <Badge
                  variant="secondary"
                  className="font-normal text-xs py-0 h-6 shrink-0 flex items-center gap-1.5 px-2 hover:bg-secondary/80 transition-colors"
                >
                  <div className="h-3.5 w-3.5 rounded-full overflow-hidden relative shrink-0">
                    {selectedItem.user.image ? (
                      <Image
                        src={selectedItem.user.image}
                        alt="User"
                        fill
                        sizes="14px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary text-[8px] font-bold">
                        {(
                          selectedItem.user.name ||
                          selectedItem.user.email ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="truncate max-w-[120px]">
                    {selectedItem.user.name ||
                      selectedItem.user.email?.split("@")[0]}
                  </span>
                </Badge>
              </>
            )}
            {isAdminView && selectedItem.model && (
              <>
                <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-border mx-1"></span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-primary/70 bg-primary/5"
                >
                  {selectedItem.model.name} {selectedItem.model.version}
                </Badge>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-2 cursor-pointer hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 overflow-x-hidden">
          {/* Use key={selectedItem.id} to re-trigger animations when changing pages */}
          <div
            key={selectedItem.id}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 h-full animate-in fade-in slide-in-from-right-4 duration-500"
          >
            {/* Left: Image Canvas */}
            <div className="relative lg:col-span-2 h-full min-h-[250px] lg:min-h-[400px] flex items-center justify-center group animate-in fade-in duration-500 delay-100 fill-mode-backwards">
              {/* Mobile Navigation (Overlay on Image) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                disabled={selectedIndex === 0}
                className="md:hidden cursor-pointer absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/50 text-foreground rounded-full hover:bg-background/80 backdrop-blur-md transition-all disabled:opacity-0 disabled:cursor-not-allowed z-10 shadow-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                disabled={selectedIndex === totalItems - 1}
                className="md:hidden cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-background/50 text-foreground rounded-full hover:bg-background/80 backdrop-blur-md transition-all disabled:opacity-0 disabled:cursor-not-allowed z-10 shadow-sm"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {(() => {
                const imageUrl = selectedItem.imageUrl
                  ? selectedItem.imageUrl
                  : `/api/images/${selectedItem.imageName}`;
                return (
                  <ImagePreview
                    previewUrl={imageUrl}
                    result={selectedItem as AnalysisResult}
                    loading={false}
                    readOnly={true}
                  />
                );
              })()}
            </div>

            {/* Right: Results Panel */}
            <div className="h-full animate-in fade-in duration-500">
              {(() => {
                const imageUrl = selectedItem.imageUrl
                  ? selectedItem.imageUrl
                  : `/api/images/${selectedItem.imageName}`;
                return (
                  <AnalysisResultPanel
                    previewUrl={imageUrl}
                    result={selectedItem as AnalysisResult}
                    loading={false}
                    error={null}
                    onAnalyze={() => {}}
                    onUploadNew={() => {}}
                    readOnly={true} // ซ่อนปุ่มอัปโหลดรูปใหม่
                  />
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
