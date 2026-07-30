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
          "flex w-full items-center cursor-pointer justify-center gap-2 px-3 py-1.5 bg-card border rounded-lg shadow-sm text-sm transition-colors hover:bg-muted",
          isFiltered && "border-primary/50 text-primary",
        )}
      >
        <Filter className="size-4" />
        <span>ตัวกรอง</span>
        {isFiltered && (
          <span className="flex h-2 w-2 rounded-full bg-primary absolute -top-0.5 right-0" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-3rem)] sm:w-72 max-w-sm bg-background border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 space-y-1 max-h-[75vh] overflow-y-auto scrollbar-thin">
            {/* 1. ค้นหา */}
            {showSearch && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  ค้นหาคำ
                </label>
                <div className="relative flex items-center">
                  <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5" />
                  <input
                    type="text"
                    placeholder="พิมพ์ค้นหา..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full bg-muted border-none text-xs outline-none pl-8 pr-8 py-1.5 rounded-md"
                  />
                  {localSearch && (
                    <button
                      onClick={() => setLocalSearch("")}
                      className="absolute right-1.5 text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2. กรองตามชนิดสิว */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                        "flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors",
                        isDisabled
                          ? "opacity-50 cursor-not-allowed line-through text-muted-foreground"
                          : "hover:bg-muted",
                        isSelected && !isDisabled
                          ? "bg-primary/5 text-primary text-bold"
                          : "",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors",
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
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
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
            <div className="p-2 border-t bg-muted/30">
              <button
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                }}
                className="w-full cursor-pointer py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
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
