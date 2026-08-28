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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
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
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-[1.2rem] blur-xl opacity-0 group-hover:opacity-60 transition duration-700 ease-out z-0" />

            <div
              onClick={() => onSelect(index)}
              className="relative z-10 h-full bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:border-primary/50 transition-all duration-500 ease-out cursor-pointer flex flex-col hover:-translate-y-2"
            >
              {/* Image Container with Gradients */}
              <div className="relative h-56 w-full bg-muted overflow-hidden shrink-0">
                <Image
                  src={imageUrl}
                  alt="History thumbnail"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized={true}
                  className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                />
                {/* Gradient Overlays for Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40 opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Top Bar: Admin User Info & Severity */}
                <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
                  {isAdminView && item.user ? (
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full p-1 pr-3 border border-white/20 shadow-lg transform transition-transform duration-500 group-hover:translate-x-1 group-hover:scale-105">
                      <div className="h-7 w-7 rounded-full bg-muted overflow-hidden relative shrink-0 border border-white/30">
                        {item.user.image ? (
                          <Image
                            src={item.user.image}
                            alt={item.user.name || "User"}
                            fill
                            sizes="28px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-primary/40 flex items-center justify-center text-white text-xs font-bold">
                            {(item.user.name || item.user.email || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-white max-w-[100px] truncate drop-shadow-md">
                        {item.user.name || item.user.email?.split("@")[0]}
                      </span>
                    </div>
                  ) : (
                    <div /> // Spacer if no user
                  )}

                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-bold border px-3 py-1 rounded-full backdrop-blur-md transform transition-all duration-500 group-hover:scale-110",
                      badgeStyle,
                    )}
                  >
                    {severityInfo.label}
                  </Badge>
                </div>

                {/* Bottom Image Info */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div className="flex flex-col gap-1 transform transition-transform duration-500 group-hover:-translate-y-1">
                    <div className="flex items-center text-[10px] text-white/90 font-medium">
                      <Clock className="h-3.5 w-3.5 mr-1 opacity-80" />
                      {new Date(item.createdAt).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      น.
                    </div>
                    <div className="text-white font-medium text-sm leading-tight drop-shadow-md">
                      ตรวจพบสิว{" "}
                      <span className="text-primary font-black text-2xl ml-1 drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]">
                        {item.total}
                      </span>{" "}
                      จุด
                    </div>
                  </div>

                  {/* View Details Icon (fades in on hover) */}
                  <div className="translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out bg-secondary text-secondary-foreground h-10 w-10 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.5)] group-hover:animate-pulse">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Card Body: Acne Breakdown */}
              <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-card to-muted/10">
                {isAdminView && item.model && (
                  <div className="mb-4 text-[11px] text-muted-foreground/80 font-mono flex items-center gap-2 border-b pb-3">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    Model:{" "}
                    <span className="font-semibold text-foreground">
                      {item.model.name}
                    </span>{" "}
                    (v{item.model.version})
                  </div>
                )}

                {item.counts && Object.keys(item.counts).length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {!isAdminView && (
                      <span className="text-xs font-semibold text-muted-foreground">
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
                              className="flex items-center gap-2 bg-background border rounded-lg px-2.5 py-1.5 shadow-sm transform transition-transform duration-300 group-hover:translate-x-1"
                              style={{ transitionDelay: `${i * 50}ms` }}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  backgroundColor: color,
                                  boxShadow: `0 0 6px ${color}`,
                                }}
                              ></span>
                              <span className="text-xs font-medium">
                                {label}
                              </span>
                              <span
                                className="text-xs font-bold ml-1"
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
                  <div className="flex items-center justify-center h-full py-6 text-sm font-bold text-emerald-500 transform transition-transform duration-500 group-hover:scale-110 group-hover:drop-shadow-sm">
                    <Activity className="w-5 h-5 mr-2" />
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
