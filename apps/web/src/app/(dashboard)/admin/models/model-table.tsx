"use client";

import React, { useMemo, useState, useRef, useCallback } from "react";
import type { AgGridReact } from "ag-grid-react";
import dynamic from "next/dynamic";
import { TableLoading } from "@/components/ui/table-loading";
import { DataGridToolbar } from "@/components/ui/data-grid-toolbar";
import { AiModel } from "@prisma/client";
import { ModelActions } from "@/components/admin/model-actions";
import { deleteAiModels } from "@/app/actions/model-actions";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { CheckCircle2, Circle, Cpu, Trash2, Loader2 } from "lucide-react";
import { SelectionChangedEvent } from "ag-grid-community";
import { Button } from "@/components/ui/button";

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
      const result = await deleteAiModels(modelsToDelete);
      if (result.error) {
        alert("เกิดข้อผิดพลาดในการลบโมเดลแบบกลุ่ม");
      } else {
        setRowData((prev) =>
          prev.filter((m) => !modelsToDelete.includes(m.id)),
        );
        setShowBatchDeleteDialog(false);
        setModelsToDelete([]);
        setSelectedModels([]);
        setSelectedRowCount(0);
        if (gridRef.current) {
          gridRef.current.api.deselectAll();
        }
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการลบโมเดลแบบกลุ่ม");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    setSelectedRowCount(event.api.getSelectedNodes().length);
  }, []);

  const NameCellRenderer = (props: any) => {
    const model = props.data;
    if (!model) return null;
    return (
      <div className="flex items-center gap-3 h-full">
        <div
          className={`p-2 rounded-lg ${
            model.isActive
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Cpu className="h-5 w-5" />
        </div>
        <div className="flex flex-col justify-center leading-tight">
          <p className="font-semibold text-sm m-0">
            {model.name}{" "}
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full ml-1 font-normal">
              v{model.version}
            </span>
          </p>
          <p className="text-xs text-muted-foreground m-0 truncate max-w-[300px]">
            {model.fileName}
          </p>
          {model.description && (
            <p className="text-xs text-muted-foreground m-0 truncate max-w-[300px]">
              {model.description}
            </p>
          )}
        </div>
      </div>
    );
  };

  const StatusCellRenderer = (props: any) => {
    const isActive = props.value;
    return isActive ? (
      <div className="flex items-center h-full">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          ใช้งาน
        </span>
      </div>
    ) : (
      <div className="flex items-center h-full">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          <Circle className="h-3.5 w-3.5" />
          ไม่ใช้งาน
        </span>
      </div>
    );
  };

  const DateCellRenderer = (props: any) => {
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
      <div className="flex flex-col justify-center h-full leading-tight">
        <span className="text-sm font-bold text-foreground">{dateString}</span>
        <span className="text-xs text-muted-foreground">{timeString} น.</span>
      </div>
    );
  };

  const ActionCellRenderer = (props: any) => {
    if (!props.data) return null;
    return (
      <div className="flex items-center justify-end h-full">
        <ModelActions model={props.data} />
      </div>
    );
  };

  const colDefs = useMemo<any[]>(
    () => [
      {
        field: "name",
        headerName: "ชื่อโมเดล / ไฟล์",
        flex: 2,
        minWidth: 300,
        cellRenderer: NameCellRenderer,
        filter: "agTextColumnFilter",
        filterValueGetter: (params: any) => {
          if (!params.data) return params.data?.name || "";
          return `${params.data.name || ""} ${params.data.version || ""} ${params.data.fileName || ""} ${params.data.description || ""}`;
        },
        getQuickFilterText: (params: any) => {
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
        filterValueGetter: (params: any) =>
          params.data?.isActive ? "ใช้งานอยู่" : "ไม่ได้ใช้",
      },
      {
        field: "sizeMb",
        headerName: "ขนาด",
        flex: 1,
        minWidth: 120,
        valueFormatter: (params: any) => `${params.value} MB`,
        filter: "agNumberColumnFilter",
      },
      {
        field: "_count.analyses",
        headerName: "ใช้งานไปแล้ว",
        flex: 1,
        minWidth: 120,
        valueFormatter: (params: any) => `${params.value} ครั้ง`,
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
          comparator: (filterLocalDateAtMidnight: Date, cellValue: any) => {
            if (!cellValue) return -1;
            const cellDate = new Date(cellValue);
            cellDate.setHours(0, 0, 0, 0);
            if (cellDate.getTime() === filterLocalDateAtMidnight.getTime())
              return 0;
            if (cellDate < filterLocalDateAtMidnight) return -1;
            return 1;
          },
        },
        getQuickFilterText: (params: any) => {
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
    <div className="space-y-4 h-[600px] flex flex-col">
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
            className="w-full sm:w-auto flex gap-1"
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
            <ul className="list-disc pl-5 text-sm max-h-32 overflow-y-auto">
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
