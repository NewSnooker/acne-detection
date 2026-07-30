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
        "bg-muted/60 p-1 rounded-xl inline-flex items-center border backdrop-blur-sm justify-center w-full sm:w-auto",
        className,
      )}
    >
      <button
        onClick={() => onChange("grid")}
        className={cn(
          "flex items-center w-full cursor-pointer sm:w-auto justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
          viewMode === "grid"
            ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
        )}
      >
        <LayoutGrid className="size-4" />
        <span>แบบการ์ด</span>
      </button>
      <button
        onClick={() => onChange("table")}
        className={cn(
          "flex items-center w-full cursor-pointer sm:w-auto justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
          viewMode === "table"
            ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
        )}
      >
        <List className="size-4" />
        <span>แบบตาราง</span>
      </button>
    </div>
  );
}
