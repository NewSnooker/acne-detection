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
        <div className="relative bg-card border rounded-lg shadow-sm flex items-center">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={currentSearch}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="bg-transparent border-none text-sm outline-none pl-9 pr-3 py-1.5 w-40 sm:w-60"
          />
          {currentSearch && (
            <button
              onClick={() => onFilterChange("search", "")}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* กรองวันที่ */}
      <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-sm text-sm">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <input
          type="date"
          value={currentDate}
          onChange={(e) => onFilterChange("date", e.target.value)}
          className="bg-transparent border-none text-sm outline-none cursor-pointer text-muted-foreground"
        />
      </div>

      {/* เรียงลำดับ */}
      <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-sm text-sm">
        <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
        <select 
          value={currentSort}
          onChange={(e) => onFilterChange("sort", e.target.value)}
          className="bg-transparent border-none text-sm outline-none cursor-pointer"
        >
          <option value="desc">ใหม่สุดไปเก่าสุด</option>
          <option value="asc">เก่าสุดไปใหม่สุด</option>
        </select>
      </div>

      {isFiltered && (
        <button 
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted ml-2"
        >
          รีเซ็ต
        </button>
      )}
    </div>
  );
}
