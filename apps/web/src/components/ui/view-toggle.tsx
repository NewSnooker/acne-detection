"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  viewMode: "grid" | "table";
  onChange: (mode: "grid" | "table") => void;
  className?: string;
}

export function ViewToggle({ viewMode, onChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn(
        "bg-muted/60 inline-flex w-full items-center justify-center rounded-xl border p-1 backdrop-blur-sm sm:w-auto",
        className,
      )}
    >
      <button
        onClick={() => onChange("grid")}
        className={cn(
          "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:w-auto",
          viewMode === "grid"
            ? "bg-background text-foreground ring-border/50 shadow-sm ring-1"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
        )}
      >
        <LayoutGrid className="size-4" />
        <span>แบบการ์ด</span>
      </button>
      <button
        onClick={() => onChange("table")}
        className={cn(
          "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:w-auto",
          viewMode === "table"
            ? "bg-background text-foreground ring-border/50 shadow-sm ring-1"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
        )}
      >
        <List className="size-4" />
        <span>แบบตาราง</span>
      </button>
    </div>
  );
}
