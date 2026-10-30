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
    <div className="flex w-full flex-col items-center justify-between gap-3 sm:flex-row">
      <div className="flex w-full items-center justify-center gap-4 sm:w-auto sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-background h-10 pl-9"
          />
        </div>
      </div>

      <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-end">
        {totalItems !== undefined && (
          <div className="text-muted-foreground items-center text-sm font-medium whitespace-nowrap">
            พบข้อมูล:{" "}
            <span className="text-foreground mx-1 font-bold">{totalItems}</span>{" "}
            รายการ
          </div>
        )}
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
