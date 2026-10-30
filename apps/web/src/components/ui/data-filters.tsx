"use client";

import { ArrowDownUp, Search, X, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataFiltersProps {
  currentSort: "asc" | "desc";
  currentSearch?: string;
  currentDate?: string; // Example: "2026-07-27"
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
  showSearch?: boolean;
  className?: string;
}

export function DataFilters({
  currentSort,
  currentSearch = "",
  currentDate = "",
  onFilterChange,
  onReset,
  showSearch = true,
  className,
}: DataFiltersProps) {
  const isFiltered = currentSort !== "desc" || !!currentSearch || !!currentDate;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* แถบค้นหา (Search Bar) */}
      {showSearch && (
        <div className="bg-card relative flex items-center rounded-lg border shadow-sm">
          <Search className="text-muted-foreground absolute left-3 h-4 w-4" />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={currentSearch}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="w-40 border-none bg-transparent py-1.5 pr-3 pl-9 text-sm outline-none sm:w-60"
          />
          {currentSearch && (
            <button
              onClick={() => onFilterChange("search", "")}
              className="text-muted-foreground hover:text-foreground absolute right-2"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* กรองวันที่ */}
      <div className="bg-card flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm shadow-sm">
        <CalendarIcon className="text-muted-foreground h-4 w-4" />
        <input
          type="date"
          value={currentDate}
          onChange={(e) => onFilterChange("date", e.target.value)}
          className="text-muted-foreground cursor-pointer border-none bg-transparent text-sm outline-none"
        />
      </div>

      {/* เรียงลำดับ */}
      <div className="bg-card flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm shadow-sm">
        <ArrowDownUp className="text-muted-foreground h-4 w-4" />
        <select
          value={currentSort}
          onChange={(e) => onFilterChange("sort", e.target.value)}
          className="cursor-pointer border-none bg-transparent text-sm outline-none"
        >
          <option value="desc">ใหม่สุดไปเก่าสุด</option>
          <option value="asc">เก่าสุดไปใหม่สุด</option>
        </select>
      </div>

      {isFiltered && (
        <button
          onClick={onReset}
          className="text-muted-foreground hover:text-foreground ml-2 text-xs underline decoration-dotted"
        >
          รีเซ็ต
        </button>
      )}
    </div>
  );
}
