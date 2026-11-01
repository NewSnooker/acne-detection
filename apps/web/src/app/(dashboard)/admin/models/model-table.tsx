"use client";

import { toast } from "sonner";
import React, { useMemo, useState, useRef, useCallback } from "react";
import type { AgGridReact } from "ag-grid-react";
import type { ColDef, SelectionChangedEvent } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import dynamic from "next/dynamic";
import { TableLoading } from "@/components/ui/table-loading";
import { DataGridToolbar } from "@/components/ui/data-grid-toolbar";
import { AiModel } from "@prisma/client";
import { ModelActions } from "@/components/admin/model-actions";
import { ModelService } from "@/lib/api-client/model-api";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Cpu,
  Trash2,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MODEL_METRICS } from "@/types/analyze";

const DataGrid = dynamic(
  () => import("@/components/ui/data-grid").then((mod) => mod.DataGrid),
  {
    ssr: false,
    loading: () => <TableLoading />,
  },
);

interface ModelWithCount extends AiModel {
  _count: { analyses: number };
}

interface ModelTableProps {
  models: ModelWithCount[];
}

export function ModelTable({ models }: ModelTableProps) {
  const [rowData, setRowData] = useState<ModelWithCount[]>(models);

  // Sync state if models change from server without cascading renders
  const [prevModels, setPrevModels] = useState<ModelWithCount[]>(models);
  if (models !== prevModels) {
    setPrevModels(models);
    setRowData(models);
  }

  const [quickFilterText, setQuickFilterText] = useState("");
  const gridRef = useRef<AgGridReact>(null);

  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [selectedRowCount, setSelectedRowCount] = useState(0);
  const [modelsToDelete, setModelsToDelete] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelWithCount[]>([]);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

  const handleBatchDeleteClick = () => {
    if (!gridRef.current) return;
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedData = selectedNodes.map(
      (node) => node.data as ModelWithCount,
    );

    // Filter out active models as a safeguard
    const idsToDelete = selectedData
      .filter((model) => !model.isActive)
      .map((model) => model.id);

    if (idsToDelete.length === 0) return;

    setModelsToDelete(idsToDelete);
    setSelectedModels(selectedData.filter((model) => !model.isActive));
    setShowBatchDeleteDialog(true);
  };

  const confirmBatchDelete = async () => {
    if (modelsToDelete.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const result = await ModelService.deleteModels(modelsToDelete);
      if (result.error) {
        toast.error(result.error || "เกิดข้อผิดพลาดในการลบโมเดลแบบกลุ่ม");
      } else {
        setRowData((prev) =>
          prev.filter((m) => !modelsToDelete.includes(m.id)),
        );
        setShowBatchDeleteDialog(false);
        toast.success(
          `ลบโมเดล ${result.count ?? modelsToDelete.length} ตัวแล้ว`,
        );
        setModelsToDelete([]);
        setSelectedModels([]);
        setSelectedRowCount(0);
        if (gridRef.current) {
          gridRef.current.api.deselectAll();
        }
      }
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    setSelectedRowCount(event.api.getSelectedNodes().length);
  }, []);

  const NameCellRenderer = (props: CustomCellRendererProps<ModelWithCount>) => {
    const model = props.data;
    if (!model) return null;
    return (
      <div className="flex h-full items-center gap-3">
        <div
          className={`rounded-lg p-2 ${
            model.isActive
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Cpu className="h-5 w-5" />
        </div>
        <div className="flex flex-col justify-center leading-tight">
          <p className="m-0 text-sm font-semibold">
            {model.name}{" "}
            <span className="bg-muted ml-1 rounded-full px-2 py-0.5 text-xs font-normal">
              v{model.version}
            </span>
          </p>
          <p className="text-muted-foreground m-0 max-w-[300px] truncate text-xs">
            {model.fileName}
          </p>
          {model.description && (
            <p className="text-muted-foreground m-0 max-w-[300px] truncate text-xs">
              {model.description}
            </p>
          )}
        </div>
      </div>
    );
  };

  const StatusCellRenderer = (
    props: CustomCellRendererProps<ModelWithCount>,
  ) => {
    const isActive = props.value;
    return isActive ? (
      <div className="flex h-full items-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          ใช้งาน
        </span>
      </div>
    ) : (
      <div className="flex h-full items-center">
        <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
          <Circle className="h-3.5 w-3.5" />
          ไม่ใช้งาน
        </span>
      </div>
    );
  };

  const DateCellRenderer = (props: CustomCellRendererProps<ModelWithCount>) => {
    if (!props.value) return null;
    const date = new Date(props.value);
    const dateString = date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const timeString = date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="flex h-full flex-col justify-center leading-tight">
        <span className="text-foreground text-sm font-bold">{dateString}</span>
        <span className="text-muted-foreground text-xs">{timeString} น.</span>
      </div>
    );
  };

  const ActionCellRenderer = (
    props: CustomCellRendererProps<ModelWithCount>,
  ) => {
    if (!props.data) return null;
    return (
      <div className="flex h-full items-center justify-end">
        <ModelActions model={props.data} />
      </div>
    );
  };

  const colDefs = useMemo<ColDef<ModelWithCount>[]>(
    () => [
      {
        field: "name",
        headerName: "ชื่อโมเดล / ไฟล์",
        flex: 2,
        minWidth: 300,
        cellRenderer: NameCellRenderer,
        filter: "agTextColumnFilter",
        filterValueGetter: (params) => {
          if (!params.data) return "";
          return `${params.data.name || ""} ${params.data.version || ""} ${params.data.fileName || ""} ${params.data.description || ""}`;
        },
        getQuickFilterText: (params) => {
          if (!params.data) return params.value;
          return `${params.value} ${params.data.version || ""} ${params.data.fileName || ""} ${params.data.description || ""}`;
        },
      },
      {
        field: "isActive",
        headerName: "สถานะ",
        flex: 1,
        minWidth: 150,
        cellRenderer: StatusCellRenderer,
        filter: "agTextColumnFilter",
        filterValueGetter: (params) =>
          params.data?.isActive ? "ใช้งานอยู่" : "ไม่ได้ใช้",
      },
      {
        colId: "metrics",
        headerName: "ค่าประเมิน (%)",
        flex: 1.5,
        minWidth: 200,
        sortable: false,
        valueGetter: (params) =>
          MODEL_METRICS.filter(({ key }) => params.data?.[key] != null)
            .map(({ key, label }) => `${label} ${params.data?.[key]}`)
            .join(" · ") || "ยังไม่กรอก",
        wrapText: true,
        autoHeight: true,
        cellClass: "text-xs leading-relaxed py-2",
      },
      {
        field: "sizeMb",
        headerName: "ขนาด",
        flex: 1,
        minWidth: 120,
        valueFormatter: (params) => `${params.value} MB`,
        filter: "agNumberColumnFilter",
      },
      {
        field: "_count.analyses",
        headerName: "ใช้งานไปแล้ว",
        flex: 1,
        minWidth: 120,
        valueFormatter: (params) => `${params.value} ครั้ง`,
        filter: "agNumberColumnFilter",
      },
      {
        field: "createdAt",
        headerName: "วันที่อัปโหลด",
        flex: 1.5,
        minWidth: 200,
        cellRenderer: DateCellRenderer,
        filter: "agDateColumnFilter",
        filterParams: {
          buttons: ["reset"],
          comparator: (
            filterLocalDateAtMidnight: Date,
            cellValue: string | Date | null,
          ) => {
            if (!cellValue) return -1;
            const cellDate = new Date(cellValue);
            cellDate.setHours(0, 0, 0, 0);
            if (cellDate.getTime() === filterLocalDateAtMidnight.getTime())
              return 0;
            if (cellDate < filterLocalDateAtMidnight) return -1;
            return 1;
          },
        },
        getQuickFilterText: (params) => {
          if (!params.data?.createdAt) return "";
          const date = new Date(params.data.createdAt);
          const dateString = date.toLocaleDateString("th-TH", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
          });
          const timeString = date.toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return `${dateString} ${timeString} น.`;
        },
      },
      {
        headerName: "จัดการ",
        field: "id",
        flex: 1,
        minWidth: 150,
        sortable: false,
        filter: false,
        cellRenderer: ActionCellRenderer,
      },
    ],
    [],
  );

  return (
    <div className="flex h-[600px] flex-col space-y-4">
      <DataGridToolbar
        searchPlaceholder="ค้นหาโมเดล AI ทั่วทั้งตาราง..."
        searchValue={quickFilterText}
        onSearchChange={setQuickFilterText}
        totalItems={models.length}
      >
        {selectedRowCount > 0 && (
          <Button
            variant="destructive"
            onClick={handleBatchDeleteClick}
            disabled={isBatchDeleting}
            className="flex w-full gap-1 sm:w-auto"
          >
            {isBatchDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            ลบที่เลือก ({selectedRowCount})
          </Button>
        )}
      </DataGridToolbar>

      <DataGrid
        ref={gridRef}
        rowData={rowData}
        columnDefs={colDefs}
        enableSelection={true}
        onSelectionChanged={onSelectionChanged}
        quickFilterText={quickFilterText}
        isRowSelectable={(node) => !!node.data && !node.data.isActive}
      />

      {/* Batch Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={showBatchDeleteDialog}
        itemName={null}
        onClose={() => setShowBatchDeleteDialog(false)}
        onConfirm={confirmBatchDelete}
        title={`ยืนยันการลบโมเดลจำนวน ${modelsToDelete.length} รายการ`}
        description={
          <div className="space-y-2">
            <p>
              คุณแน่ใจหรือไม่ว่าต้องการลบโมเดลที่เลือกทั้งหมดนี้?
              การกระทำนี้จะลบไฟล์ .pt ออกจากเซิร์ฟเวอร์ และไม่สามารถกู้คืนได้
            </p>
            <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-sm">
              {selectedModels.map((m) => (
                <li key={m.id}>
                  {m.name} (v{m.version})
                </li>
              ))}
            </ul>
          </div>
        }
        isDeleting={isBatchDeleting}
      />
    </div>
  );
}
