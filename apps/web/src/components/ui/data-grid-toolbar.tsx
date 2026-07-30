"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface DataGridToolbarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  totalItems?: number;
  children?: React.ReactNode;
}

export function DataGridToolbar({
  searchPlaceholder = "ค้นหา...",
  searchValue,
  onSearchChange,
  totalItems,
  children,
}: DataGridToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-between items-center w-full">
      <div className="flex justify-center sm:justify-between items-center gap-4 w-full sm:w-auto">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 bg-background"
          />
        </div>
      </div>

      <div className="flex w-full sm:w-auto items-center justify-center sm:justify-end gap-2">
        {totalItems !== undefined && (
          <div className="text-sm items-center font-medium text-muted-foreground whitespace-nowrap">
            พบข้อมูล:{" "}
            <span className="font-bold text-foreground mx-1">{totalItems}</span>{" "}
            รายการ
          </div>
        )}
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
