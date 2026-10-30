import Image from "next/image";
import { Activity, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SEVERITY_LABELS, ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";
import { HistoryItem } from "./history-gallery";

interface HistoryGridViewProps {
  items: HistoryItem[];
  isAdminView: boolean;
  onSelect: (index: number) => void;
}

export function HistoryGridView({
  items,
  isAdminView,
  onSelect,
}: HistoryGridViewProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item, index) => {
        const imageUrl = item.imageUrl
          ? item.imageUrl
          : `/api/images/${item.imageName}`;
        const severityInfo =
          SEVERITY_LABELS[item.severity] || SEVERITY_LABELS.MILD;

        // Determine clear, high-contrast styles for the severity badge
        let badgeStyle = "";
        if (item.severity === "SEVERE") {
          badgeStyle =
            "bg-destructive text-destructive-foreground border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
        } else if (item.severity === "MODERATE") {
          badgeStyle =
            "bg-amber-500 text-white border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
        } else {
          // MILD - make it very clear
          badgeStyle =
            "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
        }

        return (
          <div key={item.id} className="group relative">
            {/* Purple/Primary Intense Glow Behind Card */}
            <div className="from-primary to-primary absolute -inset-0.5 z-0 rounded-[1.2rem] bg-gradient-to-r via-purple-500 opacity-0 blur-xl transition duration-700 ease-out group-hover:opacity-60" />

            <div
              onClick={() => onSelect(index)}
              className="bg-card hover:border-primary/50 relative z-10 flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-2xl"
            >
              {/* Image Container with Gradients */}
              <div className="bg-muted relative h-56 w-full shrink-0 overflow-hidden">
                <Image
                  src={imageUrl}
                  alt="History thumbnail"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized={true}
                  className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                />
                {/* Gradient Overlays for Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Top Bar: Admin User Info & Severity */}
                <div className="absolute top-3 right-3 left-3 flex items-start justify-between gap-2">
                  {isAdminView && item.user ? (
                    <div className="flex transform items-center gap-2 rounded-full border border-white/20 bg-black/50 p-1 pr-3 shadow-lg backdrop-blur-md transition-transform duration-500 group-hover:translate-x-1 group-hover:scale-105">
                      <div className="bg-muted relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/30">
                        {item.user.image ? (
                          <Image
                            src={item.user.image}
                            alt={item.user.name || "User"}
                            fill
                            sizes="28px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="bg-primary/40 flex h-full w-full items-center justify-center text-xs font-bold text-white">
                            {(item.user.name || item.user.email || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="max-w-[100px] truncate text-[11px] font-medium text-white drop-shadow-md">
                        {item.user.name || item.user.email?.split("@")[0]}
                      </span>
                    </div>
                  ) : (
                    <div /> // Spacer if no user
                  )}

                  <Badge
                    variant="outline"
                    className={cn(
                      "transform rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-md transition-all duration-500 group-hover:scale-110",
                      badgeStyle,
                    )}
                  >
                    {severityInfo.label}
                  </Badge>
                </div>

                {/* Bottom Image Info */}
                <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between">
                  <div className="flex transform flex-col gap-1 transition-transform duration-500 group-hover:-translate-y-1">
                    <div className="flex items-center text-[10px] font-medium text-white/90">
                      <Clock className="mr-1 h-3.5 w-3.5 opacity-80" />
                      {new Date(item.createdAt).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      น.
                    </div>
                    <div className="text-sm leading-tight font-medium text-white drop-shadow-md">
                      ตรวจพบสิว{" "}
                      <span className="text-primary ml-1 text-2xl font-black drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]">
                        {item.total}
                      </span>{" "}
                      จุด
                    </div>
                  </div>

                  {/* View Details Icon (fades in on hover) */}
                  <div className="bg-secondary text-secondary-foreground flex h-10 w-10 translate-y-6 items-center justify-center rounded-full opacity-0 shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:animate-pulse group-hover:opacity-100">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Card Body: Acne Breakdown */}
              <div className="from-card to-muted/10 flex flex-1 flex-col bg-gradient-to-b p-5">
                {isAdminView && item.model && (
                  <div className="text-muted-foreground/80 mb-4 flex items-center gap-2 border-b pb-3 font-mono text-[11px]">
                    <span className="bg-primary h-2 w-2 animate-pulse rounded-full"></span>
                    Model:{" "}
                    <span className="text-foreground font-semibold">
                      {item.model.name}
                    </span>{" "}
                    (v{item.model.version})
                  </div>
                )}

                {item.counts && Object.keys(item.counts).length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {!isAdminView && (
                      <span className="text-muted-foreground text-xs font-semibold">
                        รายละเอียดสิวที่พบ:
                      </span>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.counts)
                        .filter(([_, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1]) // Sort by highest count
                        .map(([type, count], i) => {
                          const color = ACNE_COLORS[type] || "#888";
                          const label = ACNE_LABELS[type] || type;
                          return (
                            <div
                              key={type}
                              className="bg-background flex transform items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-sm transition-transform duration-300 group-hover:translate-x-1"
                              style={{ transitionDelay: `${i * 50}ms` }}
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor: color,
                                  boxShadow: `0 0 6px ${color}`,
                                }}
                              ></span>
                              <span className="text-xs font-medium">
                                {label}
                              </span>
                              <span
                                className="ml-1 text-xs font-bold"
                                style={{ color: color }}
                              >
                                {count}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full transform items-center justify-center py-6 text-sm font-bold text-emerald-500 transition-transform duration-500 group-hover:scale-110 group-hover:drop-shadow-sm">
                    <Activity className="mr-2 h-5 w-5" />
                    หน้าใสไร้สิว!
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
