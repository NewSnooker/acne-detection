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
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200 md:p-12"
      onClick={onClose}
    >
      {/* Navigation Controls (Desktop - Outside Image) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        disabled={selectedIndex === 0}
        className="bg-background/20 hover:bg-background/40 absolute top-1/2 left-4 z-50 hidden -translate-y-1/2 cursor-pointer items-center justify-center rounded-full p-3 text-white backdrop-blur-md transition-all disabled:cursor-not-allowed disabled:opacity-10 md:left-8 md:flex md:p-4"
      >
        <ChevronLeft className="h-8 w-8" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        disabled={selectedIndex === totalItems - 1}
        className="bg-background/20 hover:bg-background/40 absolute top-1/2 right-4 z-50 hidden -translate-y-1/2 cursor-pointer items-center justify-center rounded-full p-3 text-white backdrop-blur-md transition-all disabled:cursor-not-allowed disabled:opacity-10 md:right-8 md:flex md:p-4"
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      <div
        className="bg-card animate-in zoom-in-95 slide-in-from-bottom-8 relative flex h-[90vh] max-h-[800px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border shadow-2xl duration-300 ease-out md:h-full"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        {/* Header */}
        <div className="animate-in fade-in slide-in-from-top-4 flex shrink-0 items-center justify-between border-b p-4 delay-100 duration-500">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="hidden text-sm font-bold sm:block">
              รายละเอียดการวิเคราะห์
            </h3>
            <h3 className="text-sm font-bold sm:hidden">ผลวิเคราะห์</h3>
            <span className="text-muted-foreground text-sm">
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
                <span className="bg-border mx-1 hidden h-1 w-1 rounded-full sm:inline-block"></span>
                <Badge
                  variant="secondary"
                  className="hover:bg-secondary/80 flex h-6 shrink-0 items-center gap-1.5 px-2 py-0 text-xs font-normal transition-colors"
                >
                  <div className="relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full">
                    {selectedItem.user.image ? (
                      <Image
                        src={selectedItem.user.image}
                        alt="User"
                        fill
                        sizes="14px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="bg-primary/20 text-primary flex h-full w-full items-center justify-center text-[8px] font-bold">
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
                  <span className="max-w-[120px] truncate">
                    {selectedItem.user.name ||
                      selectedItem.user.email?.split("@")[0]}
                  </span>
                </Badge>
              </>
            )}
            {isAdminView && selectedItem.model && (
              <>
                <span className="bg-border mx-1 hidden h-1 w-1 rounded-full sm:inline-block"></span>
                <Badge
                  variant="outline"
                  className="text-primary/70 bg-primary/5 font-mono text-[10px]"
                >
                  {selectedItem.model.name} {selectedItem.model.version}
                </Badge>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-full p-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          {/* Use key={selectedItem.id} to re-trigger animations when changing pages */}
          <div
            key={selectedItem.id}
            className="animate-in fade-in slide-in-from-right-4 grid h-full grid-cols-1 gap-6 duration-500 lg:grid-cols-3 lg:gap-8"
          >
            {/* Left: Image Canvas */}
            <div className="group animate-in fade-in fill-mode-backwards relative flex h-full min-h-[250px] items-center justify-center delay-100 duration-500 lg:col-span-2 lg:min-h-[400px]">
              {/* Mobile Navigation (Overlay on Image) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                disabled={selectedIndex === 0}
                className="bg-background/50 text-foreground hover:bg-background/80 absolute top-1/2 left-2 z-10 -translate-y-1/2 cursor-pointer rounded-full p-2 shadow-sm backdrop-blur-md transition-all disabled:cursor-not-allowed disabled:opacity-0 md:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                disabled={selectedIndex === totalItems - 1}
                className="bg-background/50 text-foreground hover:bg-background/80 absolute top-1/2 right-2 z-10 -translate-y-1/2 cursor-pointer rounded-full p-2 shadow-sm backdrop-blur-md transition-all disabled:cursor-not-allowed disabled:opacity-0 md:hidden"
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
            <div className="animate-in fade-in h-full duration-500">
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
