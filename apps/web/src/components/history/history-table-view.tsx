"use client";

import { toast } from "sonner";
import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import Image from "next/image";
import { MissingImage } from "@/components/ui/missing-image";
import type { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  RowClickedEvent,
  SelectionChangedEvent,
} from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableLoading } from "@/components/ui/table-loading";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Trash2, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SEVERITY_LABELS, ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";
import { HistoryItem } from "./history-gallery";
import { AnalyzeService } from "@/lib/api-client/analyze-api";

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
      const result = await AnalyzeService.deleteHistories(historiesToDelete);
      if (result.error) {
        toast.error(result.error || "เกิดข้อผิดพลาดในการลบประวัติการวิเคราะห์");
      } else {
        toast.success(`ลบประวัติ ${historiesToDelete.length} รายการแล้ว`);
        router.refresh(); // Use router.refresh() to avoid full page reload which resets view state
      }
    } finally {
      setIsBatchDeleting(false);
      setShowBatchDeleteDialog(false);
    }
  };

  const confirmSingleDelete = async () => {
    if (!historyToDelete) return;
    setIsDeleting(historyToDelete);
    try {
      const result = await AnalyzeService.deleteHistories([historyToDelete]);
      if (result.error) {
        toast.error(result.error || "เกิดข้อผิดพลาดในการลบประวัติการวิเคราะห์");
      } else {
        toast.success("ลบประวัติแล้ว");
        router.refresh();
      }
    } finally {
      setIsDeleting(null);
      setHistoryToDelete(null);
    }
  };

  const onSelectionChanged = useCallback(
    (event: SelectionChangedEvent<HistoryItemWithOriginalIndex>) => {
      setSelectedRowCount(event.api.getSelectedNodes().length);
    },
    [],
  );

  // useCallback: ตารางสร้างคอลัมน์ใหม่เฉพาะเมื่อค่าที่ cell ใช้เปลี่ยน
  const ImageCellRenderer = useCallback(
    (props: CustomCellRendererProps<HistoryItemWithOriginalIndex>) => {
      if (!props.data) return null;
      const imageUrl = props.data.imageUrl
        ? props.data.imageUrl
        : `/api/images/${props.data.imageName}`;
      return (
        <div
          className="flex h-full items-center py-1"
          onClick={(e) => {
            e.stopPropagation();
            if (props.data) onSelect(props.data.originalIndex);
          }}
        >
          <div className="bg-muted ring-primary/20 relative h-10 w-10 cursor-pointer overflow-hidden rounded-md shadow-sm transition-all group-hover:ring-2">
            <TableThumb src={imageUrl} />
          </div>
        </div>
      );
    },
    [onSelect],
  );

  const UserCellRenderer = (
    props: CustomCellRendererProps<HistoryItemWithOriginalIndex>,
  ) => {
    const user = props.data?.user;
    if (!user) {
      return (
        <div className="flex h-full items-center">
          <span className="text-muted-foreground text-sm">
            ไม่มีข้อมูลผู้ใช้
          </span>
        </div>
      );
    }
    return (
      <div className="flex h-full items-center gap-3">
        <div className="bg-muted relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || "User"}
              fill
              sizes="32px"
              className="object-cover"
            />
          ) : (
            <div className="bg-primary/20 text-primary flex h-full w-full items-center justify-center text-xs font-bold">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center leading-tight">
          <span className="text-foreground max-w-[150px] truncate text-sm font-medium">
            {user.name || "ผู้ใช้ไม่ระบุชื่อ"}
          </span>
          <span className="text-muted-foreground max-w-[150px] truncate text-xs">
            {user.email}
          </span>
        </div>
      </div>
    );
  };

  const ConfTtaCellRenderer = (
    props: CustomCellRendererProps<HistoryItemWithOriginalIndex>,
  ) => {
    const item = props.data;
    if (!item) return null;
    return (
      <div className="flex h-full items-center gap-2 text-sm whitespace-nowrap">
        <span
          className="font-mono tabular-nums"
          title={
            item.confidence == null
              ? "ผลเก่า ไม่ได้บันทึกค่า conf"
              : "ความมั่นใจขั้นต่ำที่ใช้ตอนวิเคราะห์"
          }
        >
          {item.confidence?.toFixed(2) ?? "—"}
        </span>
        <span className="text-muted-foreground" aria-hidden="true">
          ·
        </span>
        {item.usedTta ? (
          <span className="font-medium text-violet-600 dark:text-violet-400">
            TTA
          </span>
        ) : (
          <span className="text-muted-foreground">ไม่ใช้ TTA</span>
        )}
      </div>
    );
  };

  const ModelCellRenderer = (
    props: CustomCellRendererProps<HistoryItemWithOriginalIndex>,
  ) => {
    const model = props.data?.model;
    if (!model) {
      return (
        <div className="flex h-full items-center">
          <span className="text-muted-foreground text-sm">-</span>
        </div>
      );
    }
    return (
      <div className="flex h-full items-center">
        <Badge
          variant="outline"
          className="text-primary/70 border-primary/20 bg-primary/5 flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-xs whitespace-nowrap"
        >
          {model.name} {model.version}
        </Badge>
      </div>
    );
  };

  const DateCellRenderer = (
    props: CustomCellRendererProps<HistoryItemWithOriginalIndex>,
  ) => {
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

  const SeverityCellRenderer = (
    props: CustomCellRendererProps<HistoryItemWithOriginalIndex>,
  ) => {
    if (!props.value) return null;
    const severityInfo =
      SEVERITY_LABELS[props.value as keyof typeof SEVERITY_LABELS] ||
      SEVERITY_LABELS.MILD;
    return (
      <div className="flex h-full items-center">
        <Badge
          variant="outline"
          className={cn(
            "flex w-fit items-center gap-1.5 rounded-full border border-current px-2 py-0.5 text-xs font-bold",
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

  const AcneCellRenderer = (
    props: CustomCellRendererProps<HistoryItemWithOriginalIndex>,
  ) => {
    const item = props.data;
    if (!item) return null;
    return (
      <div className="flex h-fit flex-col justify-center py-1">
        <div className="text-primary mb-1 text-sm font-bold">
          {item.total} จุด
        </div>
        {item.counts && Object.keys(item.counts).length > 0 && (
          <div className="flex h-fit flex-wrap gap-1">
            {Object.entries(item.counts)
              .filter(([_, count]) => (count as number) > 0)
              .map(([type, count]) => {
                const color = ACNE_COLORS[type] || "";
                const label = ACNE_LABELS[type] || type;
                return (
                  <Badge
                    variant="outline"
                    key={type}
                    className="flex w-fit items-center gap-1.5 rounded-full border border-current px-2 py-0.5 text-xs font-bold whitespace-nowrap"
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

  const ActionCellRenderer = useCallback(
    (props: CustomCellRendererProps<HistoryItemWithOriginalIndex>) => {
      if (!props.data) return null;
      const item = props.data;

      if (!isAdminView) return null;

      return (
        <div className="flex h-full items-center justify-end gap-2 pr-2">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`hover:text-destructive h-8 w-8 rounded-md`}
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
    },
    [isAdminView, isDeleting, isBatchDeleting],
  );

  const colDefs = useMemo<ColDef<HistoryItemWithOriginalIndex>[]>(() => {
    const cols: ColDef<HistoryItemWithOriginalIndex>[] = [
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
          getQuickFilterText: (params) => {
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
        {
          colId: "confTta",
          headerName: "conf / TTA",
          width: 150,
          sortable: false,
          filter: false,
          cellRenderer: ConfTtaCellRenderer,
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
  }, [isAdminView, ImageCellRenderer, ActionCellRenderer]);

  return (
    <div className="flex h-full flex-col space-y-4">
      {isAdminView && selectedRowCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={handleBatchDeleteClick}
            disabled={isBatchDeleting}
            className="flex w-full cursor-pointer gap-1 sm:w-auto"
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
          onRowClicked={(
            event: RowClickedEvent<HistoryItemWithOriginalIndex>,
          ) => {
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
                <ul className="text-muted-foreground max-h-32 list-disc overflow-y-auto pl-5 text-sm">
                  {selectedHistories.map((h) => (
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

// รูปย่อในตาราง ถ้าโหลดไม่ได้แสดงไอคอนแทน
function TableThumb({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <MissingImage compact />;
  return (
    <Image
      src={src}
      alt="รูปที่วิเคราะห์"
      fill
      sizes="40px"
      unoptimized
      onError={() => setBroken(true)}
      className="object-cover"
    />
  );
}
