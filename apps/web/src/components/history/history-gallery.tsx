"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { useState, useEffect } from "react";
import { Activity, Search } from "lucide-react";
import { AnalysisResult } from "@/types/analyze";
import { Pagination } from "@/components/ui/pagination";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { ViewToggle } from "@/components/ui/view-toggle";

// Sub-components & Hooks
import { useHistoryFilters } from "@/hooks/use-history-filters";
import { HistoryGridView } from "./history-grid-view";
import { HistoryTableView } from "./history-table-view";
import { HistoryModal } from "./history-modal";
import { Input } from "@/components/ui/input";

export interface HistoryItem extends Omit<AnalysisResult, "id"> {
  id: string;
  createdAt: Date;
  user?: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  model?: {
    name: string;
    version: string;
  } | null;
}

interface HistoryGalleryProps {
  items: HistoryItem[];
  totalItems: number;
  currentSort: string;
  typeCounts: Record<string, number>;
  isAdminView?: boolean;
}

export function HistoryGallery({
  items,
  totalItems,
  currentSort,
  typeCounts,
  isAdminView = false,
}: HistoryGalleryProps) {
  const {
    updateFilters,
    handleResetFilters,
    currentSearch,
    currentDate,
    currentTypes,
  } = useHistoryFilters();

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(20);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Reset pagination when global filters (which change `items`) change
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setCurrentPage(1);
  }

  // Local state for search to enable debouncing
  const [localSearch, setLocalSearch] = useState(currentSearch);
  const [prevSearch, setPrevSearch] = useState(currentSearch);

  // Sync local search when URL search changes (e.g. from Reset or initial load)
  if (currentSearch !== prevSearch) {
    setPrevSearch(currentSearch);
    setLocalSearch(currentSearch);
  }

  // Debounce effect for local search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== currentSearch) {
        updateFilters("search", localSearch);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, updateFilters]);

  // Derived state for pagination
  const totalPages = Math.ceil(items.length / currentLimit) || 1;
  const paginatedItems = items.slice(
    (currentPage - 1) * currentLimit,
    currentPage * currentLimit,
  );

  // selectedItem uses paginatedItems in Grid view but full items in Table view
  // Wait, selectedIndex is passed from HistoryGridView or HistoryTableView.
  // HistoryGridView passes the local index (0-19) so we should map it to the full index, OR
  // we just let HistoryGridView pass the actual `item` instead of `index`, OR pass the absolute index.
  // Let's pass the absolute index from HistoryGridView.

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < items.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  return (
    <>
      {/* Filters at the top (Search, Date, Sort, Reset) */}
      <div className="flex w-full flex-col items-start justify-between gap-2 md:flex-row md:items-center">
        <div className="flex w-full flex-col items-center gap-4 sm:flex-row">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          {/* We will let FilterDropdown handle the Search since it has showSearch={true} by default. But it's inside the dropdown. If we want a global search input next to the toggle, we can add it here. The user requested: "ดันช่องค้นหาไว้แถวเดียวกันกับ tab เลือกการ์ด-ตาราง" */}
          <div className="flex w-full items-center justify-center gap-4 sm:w-auto sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="ค้นหารายการ..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="bg-background h-10 pl-9"
              />
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col-reverse items-center gap-4 md:flex-row md:justify-end">
          <div className="text-muted-foreground text-sm font-medium whitespace-nowrap">
            พบข้อมูล:{" "}
            <span className="text-foreground mx-1 font-bold">
              {items.length}
            </span>{" "}
            รายการ
          </div>
          <FilterDropdown
            currentSort={currentSort}
            currentSearch={currentSearch}
            currentDate={currentDate}
            currentTypes={currentTypes}
            typeCounts={typeCounts}
            onFilterChange={updateFilters}
            onReset={handleResetFilters}
            showSearch={false}
            hideSort={viewMode === "table"}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Activity}
          className="py-20"
          title={
            currentSearch || currentDate || currentTypes.length > 0
              ? "ไม่พบข้อมูลที่ตรงกับตัวกรอง"
              : "ยังไม่มีประวัติการวิเคราะห์"
          }
          description={
            currentSearch || currentDate || currentTypes.length > 0
              ? "ลองเปลี่ยนเงื่อนไขการกรอง หรือกดปุ่ม 'ล้างค่าทั้งหมด' ในเมนูตัวกรอง"
              : "คุณยังไม่เคยวิเคราะห์สิวเลย เริ่มต้นวิเคราะห์รูปภาพแรกของคุณเพื่อติดตามสุขภาพผิวหน้าได้ที่หน้าวิเคราะห์สิว"
          }
        />
      ) : (
        <>
          {viewMode === "grid" && (
            <HistoryGridView
              items={paginatedItems}
              isAdminView={isAdminView}
              onSelect={(idx) =>
                setSelectedIndex((currentPage - 1) * currentLimit + idx)
              }
            />
          )}

          {viewMode === "table" && (
            <HistoryTableView
              items={items}
              totalItems={items.length}
              isAdminView={isAdminView}
              onSelect={setSelectedIndex}
            />
          )}
        </>
      )}

      {/* Pagination Controls */}
      {items.length > 0 && viewMode === "grid" && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={items.length}
          currentLimit={currentLimit}
          onPageChange={setCurrentPage}
          onLimitChange={setCurrentLimit}
        />
      )}

      {/* Lightbox / Modal */}
      <HistoryModal
        selectedItem={selectedIndex !== null ? items[selectedIndex] : null}
        selectedIndex={selectedIndex}
        totalItems={items.length}
        isAdminView={isAdminView}
        onClose={() => setSelectedIndex(null)}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    </>
  );
}
