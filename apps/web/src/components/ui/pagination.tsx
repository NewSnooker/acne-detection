"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  currentLimit?: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems = 0,
  currentLimit = 20,
  onPageChange,
  onLimitChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1 && (!currentLimit || totalItems === 0)) return null;

  const startItem = (currentPage - 1) * currentLimit + 1;
  const endItem = Math.min(currentPage * currentLimit, totalItems);

  return (
    <div
      className={cn(
        "m2-4 text-muted-foreground flex flex-col items-center justify-end gap-6 border-t py-4 text-sm sm:flex-row",
        className,
      )}
    >
      {/* Page Size */}
      {onLimitChange && (
        <div className="flex items-center gap-2">
          <span>Page Size:</span>
          <select
            value={currentLimit.toString()}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="border-muted-foreground/30 focus:border-primary cursor-pointer border-b bg-transparent px-1 py-0.5 outline-none"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      )}

      {/* 1 ถึง 20 จาก 100 */}
      <div className="flex items-center">
        {startItem} ถึง {endItem} จาก {totalItems}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="hover:text-foreground cursor-pointer p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="หน้าแรก"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="hover:text-foreground cursor-pointer p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="ก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="text-muted-foreground">
          หน้า <span className="text-foreground mx-1">{currentPage}</span> จาก{" "}
          {totalPages}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="hover:text-foreground cursor-pointer p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="ถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="hover:text-foreground cursor-pointer p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="หน้าสุดท้าย"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
