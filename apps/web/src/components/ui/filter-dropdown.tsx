"use client";

import { useState, useRef, useEffect } from "react";
import {
  Filter,
  Search,
  X,
  Calendar as CalendarIcon,
  ArrowDownUp,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";
import { Badge } from "@/components/ui/badge";

interface FilterDropdownProps {
  currentSort: string;
  currentSearch?: string;
  currentDate?: string;
  currentTypes?: string[];
  typeCounts: Record<string, number>;
  onFilterChange: (key: string, value: string | string[]) => void;
  onReset: () => void;
  showSearch?: boolean;
  hideSort?: boolean;
  className?: string;
}

export function FilterDropdown({
  currentSort,
  currentSearch = "",
  currentDate = "",
  currentTypes = [],
  typeCounts,
  onFilterChange,
  onReset,
  showSearch = true,
  hideSort = false,
  className,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Local state for search to enable debouncing
  const [localSearch, setLocalSearch] = useState(currentSearch);
  const [prevSearchProp, setPrevSearchProp] = useState(currentSearch);

  // Sync local search when URL search changes
  if (currentSearch !== prevSearchProp) {
    setPrevSearchProp(currentSearch);
    setLocalSearch(currentSearch);
  }

  // Debounce effect for local search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== currentSearch) {
        onFilterChange("search", localSearch);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, onFilterChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isFiltered = !!currentSearch || currentTypes.length > 0;

  // รายชื่อสิวทั้งหมด 6 ชนิด + หน้าใส
  const allAcneTypes = [
    "blackhead",
    "whitehead",
    "papule",
    "pustule",
    "nodule",
    "cyst",
    "no_acne",
  ];

  const handleTypeToggle = (type: string) => {
    if (currentTypes.includes(type)) {
      onFilterChange(
        "types",
        currentTypes.filter((t) => t !== type),
      );
    } else {
      onFilterChange("types", [...currentTypes, type]);
    }
  };

  return (
    <div
      className={cn("relative w-full sm:w-auto", className)}
      ref={dropdownRef}
    >
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "bg-card hover:bg-muted flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-sm shadow-sm transition-colors",
          isFiltered && "border-primary/50 text-primary",
        )}
      >
        <Filter className="size-4" />
        <span>ตัวกรอง</span>
        {isFiltered && (
          <span className="bg-primary absolute -top-0.5 right-0 flex h-2 w-2 rounded-full" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="bg-background absolute top-full left-0 z-50 mt-2 w-[calc(100vw-3rem)] max-w-sm overflow-hidden rounded-lg border shadow-xl sm:right-0 sm:left-auto sm:w-72">
          <div className="max-h-[75vh] scrollbar-thin space-y-1 overflow-y-auto p-3">
            {/* 1. ค้นหา */}
            {showSearch && (
              <div className="space-y-1">
                <label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  ค้นหาคำ
                </label>
                <div className="relative flex items-center">
                  <Search className="text-muted-foreground absolute left-2.5 h-3.5 w-3.5" />
                  <input
                    type="text"
                    placeholder="พิมพ์ค้นหา..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="bg-muted w-full rounded-md border-none py-1.5 pr-8 pl-8 text-xs outline-none"
                  />
                  {localSearch && (
                    <button
                      onClick={() => setLocalSearch("")}
                      className="text-muted-foreground hover:text-foreground absolute right-1.5 p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2. กรองตามชนิดสิว */}
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                ชนิดสิว
              </label>
              <div className="space-y-0.5">
                {allAcneTypes.map((type) => {
                  const count = typeCounts[type] || 0;
                  const isDisabled = count === 0;
                  const isSelected = currentTypes.includes(type);
                  const color = ACNE_COLORS[type] || "";
                  const label = ACNE_LABELS[type] || type;
                  return (
                    <label
                      key={type}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors",
                        isDisabled
                          ? "text-muted-foreground cursor-not-allowed line-through opacity-50"
                          : "hover:bg-muted",
                        isSelected && !isDisabled
                          ? "bg-primary/5 text-primary text-bold"
                          : "",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-foreground border-2 bg-transparent",
                            isDisabled && "opacity-40",
                          )}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5" />}
                        </div>
                        <span>
                          {label}{" "}
                          <Badge
                            variant="outline"
                            className="px-1 py-0 text-[8px]"
                            style={{ borderColor: color, color: color }}
                          >
                            {type}
                          </Badge>{" "}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                        ({count} รายการ)
                      </span>
                      {/* Hidden Input */}
                      <input
                        type="checkbox"
                        className="hidden"
                        disabled={isDisabled}
                        checked={isSelected}
                        onChange={() => handleTypeToggle(type)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          {isFiltered && (
            <div className="bg-muted/30 border-t p-2">
              <button
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                }}
                className="text-destructive hover:bg-destructive/10 w-full cursor-pointer rounded-md py-1.5 text-xs font-medium transition-colors"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
