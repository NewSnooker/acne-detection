"use client";

import { useTheme } from "next-themes";
import { AgGridReact, AgGridReactProps } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  ClientSideRowModelModule,
  ValidationModule,
} from "ag-grid-community";
import { agGridLightTheme, agGridDarkTheme } from "@/lib/ag-grid-theme";
import { forwardRef, useMemo } from "react";

const AG_GRID_LOCALE_TH = {
  // Set Filter
  selectAll: "(เลือกทั้งหมด)",
  selectAllSearchResults: "(เลือกผลการค้นหาทั้งหมด)",
  searchOoo: "ค้นหา...",
  blanks: "(ข้อมูลว่าง)",
  noMatches: "ไม่พบข้อมูล",

  // Number Filter & Text Filter
  filterOoo: "กรอง...",
  equals: "เท่ากับ",
  notEqual: "ไม่เท่ากับ",
  blank: "ว่าง",
  notBlank: "ไม่ว่าง",
  empty: "เลือกรูปแบบ",

  // Number Filter
  lessThan: "น้อยกว่า",
  greaterThan: "มากกว่า",
  lessThanOrEqual: "น้อยกว่าหรือเท่ากับ",
  greaterThanOrEqual: "มากกว่าหรือเท่ากับ",
  inRange: "อยู่ในช่วง",
  inRangeStart: "จาก",
  inRangeEnd: "ถึง",

  // Text Filter
  contains: "มีคำว่า",
  notContains: "ไม่มีคำว่า",
  startsWith: "เริ่มต้นด้วย",
  endsWith: "ลงท้ายด้วย",

  // Date Filter
  dateFormatOoo: "yyyy-mm-dd",
  before: "ก่อน",
  after: "หลัง",

  // Filter Conditions
  andCondition: "และ",
  orCondition: "หรือ",

  // Filter Buttons
  applyFilter: "ตกลง",
  resetFilter: "รีเซ็ต",
  clearFilter: "ล้างค่า",
  cancelFilter: "ยกเลิก",

  // Pagination
  page: "หน้า",
  more: "เพิ่มเติม",
  to: "ถึง",
  of: "จาก",
  next: "ถัดไป",
  last: "สุดท้าย",
  first: "แรก",
  previous: "ก่อนหน้า",
  loadingOoo: "กำลังโหลด...",
};

// Fix Error 239 by explicitly registering the modules globally
ModuleRegistry.registerModules([
  AllCommunityModule,
  ClientSideRowModelModule,
  ValidationModule,
]);

export interface DataGridProps extends AgGridReactProps {
  /** If true, enables multi-row selection with checkboxes */
  enableSelection?: boolean;
}

export const DataGrid = forwardRef<AgGridReact, DataGridProps>(
  (
    {
      enableSelection = false,
      defaultColDef,
      rowSelection,
      isRowSelectable,
      ...props
    },
    ref,
  ) => {
    const { theme, systemTheme } = useTheme();
    const isDark =
      theme === "dark" || (theme === "system" && systemTheme === "dark");

    const defaultColDefMerged = useMemo(
      () => ({
        sortable: true,
        filter: true,
        floatingFilter: false,
        filterParams: {
          buttons: ["reset"],
        },
        resizable: true,
        cellStyle: { display: "flex", alignItems: "center" },
        ...defaultColDef,
      }),
      [defaultColDef],
    );

    const mergedRowSelection = useMemo(() => {
      if (rowSelection) return rowSelection;
      if (enableSelection) {
        return {
          mode: "multiRow" as const,
          hideDisabledCheckboxes: false,
          isRowSelectable: isRowSelectable,
        };
      }
      return undefined;
    }, [enableSelection, rowSelection, isRowSelectable]);

    return (
      <div
        className="w-full flex-1 overflow-hidden rounded-xl border shadow-sm"
        style={{ height: "100%", minHeight: "500px" }}
      >
        <AgGridReact
          ref={ref}
          modules={[
            AllCommunityModule,
            ClientSideRowModelModule,
            ValidationModule,
          ]}
          theme={isDark ? agGridDarkTheme : agGridLightTheme}
          defaultColDef={defaultColDefMerged}
          rowSelection={mergedRowSelection}
          pagination={props.pagination ?? true}
          paginationPageSize={props.paginationPageSize ?? 20}
          paginationPageSizeSelector={
            props.paginationPageSizeSelector ?? [10, 20, 50, 100]
          }
          rowHeight={props.rowHeight ?? 72}
          headerHeight={props.headerHeight ?? 72}
          localeText={AG_GRID_LOCALE_TH}
          enableCellTextSelection={props.enableCellTextSelection ?? true}
          {...props}
        />
      </div>
    );
  },
);
DataGrid.displayName = "DataGrid";
