"use client";

import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import Image from "next/image";
import type { AgGridReact } from "ag-grid-react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableLoading } from "@/components/ui/table-loading";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Trash2, Loader2, Maximize2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SEVERITY_LABELS, ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";
import { HistoryItem } from "./history-gallery";
import { deleteHistories } from "@/app/actions/analyze-actions";

const DataGrid = dynamic(
  () => import("@/components/ui/data-grid").then((mod) => mod.DataGrid),
  { ssr: false, loading: () => <TableLoading /> },
);

interface HistoryItemWithOriginalIndex extends HistoryItem {
  originalIndex: number;
}

interface HistoryTableViewProps {
  items: HistoryItem[];
  totalItems?: number;
  isAdminView: boolean;
  onSelect: (index: number) => void;
}

export function HistoryTableView({
  items,
  totalItems,
  isAdminView,
  onSelect,
}: HistoryTableViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);

  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [selectedRowCount, setSelectedRowCount] = useState(0);
  const [historiesToDelete, setHistoriesToDelete] = useState<string[]>([]);
  const [selectedHistories, setSelectedHistories] = useState<HistoryItem[]>([]);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [historyToDelete, setHistoryToDelete] = useState<string | null>(null);

  // Sync rows and add originalIndex
  const rowData = useMemo(() => {
    return items.map((item, index) => ({
      ...item,
      originalIndex: index,
    }));
  }, [items]);

  // Clear AG Grid local filters and sorting when global filters (URL) change
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setFilterModel(null);
      gridRef.current.api.applyColumnState({
        defaultState: { sort: null },
      });
    }
  }, [searchParams]);

  const handleBatchDeleteClick = () => {
    if (!gridRef.current) return;
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const idsToDelete = selectedNodes.map((node) => node.data.id);

    if (idsToDelete.length === 0) return;
    setHistoriesToDelete(idsToDelete);
    setSelectedHistories(selectedNodes.map((node) => node.data));
    setShowBatchDeleteDialog(true);
  };

  const confirmBatchDelete = async () => {
    if (historiesToDelete.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const result = await deleteHistories(historiesToDelete);
      if (result.error) {
        alert("เกิดข้อผิดพลาดในการลบประวัติการวิเคราะห์");
      } else {
        router.refresh(); // Use router.refresh() to avoid full page reload which resets view state
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการลบประวัติการวิเคราะห์");
    } finally {
      setIsBatchDeleting(false);
      setShowBatchDeleteDialog(false);
    }
  };

  const confirmSingleDelete = async () => {
    if (!historyToDelete) return;
    setIsDeleting(historyToDelete);
    try {
      const result = await deleteHistories([historyToDelete]);
      if (result.error) {
        alert("เกิดข้อผิดพลาดในการลบประวัติการวิเคราะห์");
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการลบประวัติการวิเคราะห์");
    } finally {
      setIsDeleting(null);
      setHistoryToDelete(null);
    }
  };

  const onSelectionChanged = useCallback((event: any) => {
    setSelectedRowCount(event.api.getSelectedNodes().length);
  }, []);

  const ImageCellRenderer = (props: any) => {
    if (!props.data) return null;
    const imageUrl = props.data.imageProvider === "cloudinary" && props.data.imageUrl
      ? props.data.imageUrl
      : `/api/images/${props.data.imageName}`;
    return (
      <div
        className="flex items-center h-full py-1"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(props.data.originalIndex);
        }}
      >
        <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted group-hover:ring-2 ring-primary/20 transition-all cursor-pointer shadow-sm">
          <Image
            src={imageUrl}
            alt="thumbnail"
            fill
            sizes="40px"
            unoptimized={true}
            className="object-cover"
          />
        </div>
      </div>
    );
  };

  const UserCellRenderer = (props: any) => {
    const user = props.data?.user;
    if (!user) {
      return (
        <div className="flex items-center h-full">
          <span className="text-sm text-muted-foreground">
            ไม่มีข้อมูลผู้ใช้
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 h-full">
        <div className="h-8 w-8 rounded-full bg-muted overflow-hidden relative shrink-0">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || "User"}
              fill
              sizes="32px"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center leading-tight">
          <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
            {user.name || "ผู้ใช้ไม่ระบุชื่อ"}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
            {user.email}
          </span>
        </div>
      </div>
    );
  };

  const ModelCellRenderer = (props: any) => {
    const model = props.data?.model;
    if (!model) {
      return (
        <div className="flex items-center h-full">
          <span className="text-sm text-muted-foreground ">-</span>
        </div>
      );
    }
    return (
      <div className="flex items-center h-full">
        <Badge
          variant="outline"
          className="font-mono text-xs text-primary/70 border-primary/20 bg-primary/5 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit whitespace-nowrap"
        >
          {model.name} {model.version}
        </Badge>
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

  const SeverityCellRenderer = (props: any) => {
    if (!props.value) return null;
    const severityInfo =
      SEVERITY_LABELS[props.value as keyof typeof SEVERITY_LABELS] ||
      SEVERITY_LABELS.MILD;
    return (
      <div className="flex items-center h-full">
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-bold border border-current px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit",
            severityInfo.bg,
            severityInfo.color,
          )}
        >
          <span className={severityInfo.bg} />
          {severityInfo.label}
        </Badge>
      </div>
    );
  };

  const AcneCellRenderer = (props: any) => {
    const item = props.data;
    if (!item) return null;
    return (
      <div className="flex flex-col justify-center py-1 h-fit">
        <div className="font-bold text-primary text-sm mb-1">
          {item.total} จุด
        </div>
        {item.counts && Object.keys(item.counts).length > 0 && (
          <div className="flex flex-wrap h-fit gap-1">
            {Object.entries(item.counts)
              .filter(([_, count]) => (count as number) > 0)
              .map(([type, count]) => {
                const color = ACNE_COLORS[type] || "";
                const label = ACNE_LABELS[type] || type;
                return (
                  <Badge
                    variant="outline"
                    key={type}
                    className="text-xs font-bold border border-current px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit whitespace-nowrap"
                    style={{ borderColor: color, color: color }}
                  >
                    {label} ({count as number})
                  </Badge>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  const ActionCellRenderer = (props: any) => {
    if (!props.data) return null;
    const item = props.data;

    if (!isAdminView) return null;

    return (
      <div className="flex items-center justify-end h-full gap-2 pr-2">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-md hover:text-destructive h-8 w-8`}
                onClick={(e) => {
                  e.stopPropagation();
                  setHistoryToDelete(item.id);
                }}
                disabled={isDeleting === item.id || isBatchDeleting}
              >
                {isDeleting === item.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>ลบประวัตินี้</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  const colDefs = useMemo<any[]>(() => {
    const cols: any[] = [
      {
        field: "imageName",
        headerName: "รูปภาพ",
        width: 120,
        sortable: false,
        filter: false,
        cellRenderer: ImageCellRenderer,
      },
    ];

    if (isAdminView) {
      cols.push(
        {
          field: "user.name",
          headerName: "ผู้ใช้งาน",
          flex: 1.5,
          minWidth: 200,
          cellRenderer: UserCellRenderer,
          filter: "agTextColumnFilter",
          getQuickFilterText: (params: any) => {
            const user = params.data?.user;
            return user ? `${user.name || ""} ${user.email || ""}` : "";
          },
        },
        {
          field: "model.name",
          headerName: "โมเดลที่ใช้",
          flex: 1,
          minWidth: 150,
          cellRenderer: ModelCellRenderer,
        },
      );
    }

    cols.push(
      {
        field: "createdAt",
        headerName: "วันที่วิเคราะห์",
        flex: 1,
        minWidth: 150,
        cellRenderer: DateCellRenderer,
      },
      {
        field: "severity",
        headerName: "ความรุนแรง",
        flex: 1,
        minWidth: 150,
        cellRenderer: SeverityCellRenderer,
      },
      {
        field: "total",
        headerName: "สิวที่พบ",
        flex: 2,
        minWidth: 250,
        cellRenderer: AcneCellRenderer,
        sortable: false,
        filter: false,
        autoHeight: true,
      },
    );

    if (isAdminView) {
      cols.push({
        headerName: "จัดการ",
        field: "id",
        width: 100,
        cellRenderer: ActionCellRenderer,
        sortable: false,
        filter: false,
      });
    }

    return cols;
  }, [isAdminView, isDeleting, isBatchDeleting]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {isAdminView && selectedRowCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={handleBatchDeleteClick}
            disabled={isBatchDeleting}
            className="w-full sm:w-auto flex gap-1 cursor-pointer"
          >
            {isBatchDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            ลบที่เลือก ({selectedRowCount})
          </Button>
        </div>
      )}

      <div className="h-[600px] w-full cursor-pointer [&_.ag-row]:cursor-pointer">
        <DataGrid
          ref={gridRef}
          rowData={rowData}
          columnDefs={colDefs}
          enableSelection={isAdminView}
          onSelectionChanged={onSelectionChanged}
          rowHeight={80}
          pagination={true}
          onRowClicked={(event: any) => {
            // Ignore clicks on checkboxes or buttons
            const target = event.event?.target as HTMLElement;
            if (
              target &&
              (target.closest(".ag-selection-checkbox") ||
                target.closest("button"))
            ) {
              return;
            }
            if (event.data) {
              onSelect(event.data.originalIndex);
            }
          }}
          // rowSelection={{ mode: "multiRow", enableClickSelection: false }}
        />
      </div>

      {isAdminView && (
        <>
          <ConfirmDeleteDialog
            isOpen={showBatchDeleteDialog}
            itemName={null}
            onClose={() => setShowBatchDeleteDialog(false)}
            onConfirm={confirmBatchDelete}
            title={`ยืนยันการลบประวัติจำนวน ${historiesToDelete.length} รายการ`}
            description={
              <div className="space-y-2">
                <p>
                  คุณแน่ใจหรือไม่ว่าต้องการลบประวัติที่เลือกทั้งหมดนี้?
                  การกระทำนี้จะไม่สามารถกู้คืนข้อมูลและรูปภาพได้
                </p>
                <ul className="list-disc pl-5 text-sm max-h-32 overflow-y-auto text-muted-foreground">
                  {selectedHistories.map((h, i) => (
                    <li key={h.id}>
                      {h.user?.name || h.user?.email || "ผู้ใช้ไม่ระบุชื่อ"} -{" "}
                      {new Date(h.createdAt).toLocaleDateString("th-TH")}
                    </li>
                  ))}
                </ul>
              </div>
            }
            isDeleting={isBatchDeleting}
          />

          <ConfirmDeleteDialog
            isOpen={!!historyToDelete}
            itemName={null}
            onClose={() => setHistoryToDelete(null)}
            onConfirm={confirmSingleDelete}
            title={`ยืนยันการลบประวัติ`}
            description="คุณแน่ใจหรือไม่ว่าต้องการลบประวัตินี้? การกระทำนี้จะไม่สามารถกู้คืนข้อมูลและรูปภาพได้"
            isDeleting={isDeleting !== null}
          />
        </>
      )}
    </div>
  );
}
