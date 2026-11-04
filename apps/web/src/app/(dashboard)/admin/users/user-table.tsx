"use client";

import { toast } from "sonner";
import React, { useMemo, useState, useRef, useCallback } from "react";
import type { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import dynamic from "next/dynamic";
import { TableLoading } from "@/components/ui/table-loading";

const DataGrid = dynamic(
  () => import("@/components/ui/data-grid").then((mod) => mod.DataGrid),
  {
    ssr: false,
    loading: () => <TableLoading />,
  },
);
import { DataGridToolbar } from "@/components/ui/data-grid-toolbar";

import { UserService } from "@/lib/api-client/user-api";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Activity } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface UserItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "ADMIN" | "USER";
  createdAt: Date;
  _count: {
    analyses: number;
  };
}

interface UserTableProps {
  users: UserItem[];
  currentUserId: string;
}

export function UserTable({ users, currentUserId }: UserTableProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Single delete state
  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Batch delete state
  const [usersToDelete, setUsersToDelete] = useState<string[]>([]);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

  const [rowData, setRowData] = useState<UserItem[]>(users);

  // Sync state if users change from server without cascading renders
  const [prevUsers, setPrevUsers] = useState<UserItem[]>(users);
  if (users !== prevUsers) {
    setPrevUsers(users);
    setRowData(users);
  }
  const [quickFilterText, setQuickFilterText] = useState("");
  const [selectedRowCount, setSelectedRowCount] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<UserItem[]>([]);
  const gridRef = useRef<AgGridReact>(null);

  const handleDeleteUser = useCallback(
    (userId: string, userName: string) => {
      if (userId === currentUserId) return; // Safeguard
      setUserToDelete({ id: userId, name: userName });
    },
    [currentUserId],
  );

  const handleBatchDeleteClick = () => {
    if (!gridRef.current) return;
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedData = selectedNodes.map((node) => node.data as UserItem);

    // Filter out the current admin so they don't delete themselves by accident
    const idsToDelete = selectedData
      .filter((user) => user.id !== currentUserId)
      .map((user) => user.id);

    if (idsToDelete.length === 0) return;

    setUsersToDelete(idsToDelete);
    setSelectedUsers(selectedData.filter((user) => user.id !== currentUserId));
    setShowBatchDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(userToDelete.id);
    try {
      const result = await UserService.deleteUser(userToDelete.id);
      if (result.error) {
        toast.error(result.error || "เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้");
      } else {
        setRowData((prev) => prev.filter((u) => u.id !== userToDelete.id));
        toast.success("ลบบัญชีผู้ใช้แล้ว");
      }
    } finally {
      setIsDeleting(null);
      setUserToDelete(null);
    }
  };

  const confirmBatchDelete = async () => {
    if (usersToDelete.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const result = await UserService.deleteUsers(usersToDelete);
      if (result.error) {
        toast.error(result.error);
      } else {
        setRowData((prev) => prev.filter((u) => !usersToDelete.includes(u.id)));
        toast.success(
          `ลบผู้ใช้ ${result.count ?? usersToDelete.length} คนแล้ว`,
        );
      }
    } finally {
      setIsBatchDeleting(false);
      setShowBatchDeleteDialog(false);
      setUsersToDelete([]);
      setSelectedUsers([]);
      // Clear selection
      if (gridRef.current) {
        gridRef.current.api.deselectAll();
      }
    }
  };

  const onSelectionChanged = useCallback(() => {
    if (gridRef.current) {
      // Exclude self from the count since we can't delete ourselves
      const selectedNodes = gridRef.current.api.getSelectedNodes();
      const validSelection = selectedNodes.filter(
        (node) => node.data.id !== currentUserId,
      );
      setSelectedRowCount(validSelection.length);
    }
  }, [currentUserId]);

  // Custom Cell Renderers
  const UserCellRenderer = (props: CustomCellRendererProps<UserItem>) => {
    const user = props.data;
    if (!user) return null;
    return (
      <div className="flex h-full items-center gap-3">
        <div className="bg-muted text-primary relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-bold shadow-sm">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || "User"}
              fill
              sizes="32px"
              className="object-cover"
            />
          ) : (
            (user.name || user.email || "U").charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex flex-col justify-center leading-tight">
          <span className="text-foreground text-sm font-bold">
            {user.name || "ผู้ใช้ไม่ระบุชื่อ"}
          </span>
          <span className="text-muted-foreground text-xs">{user.email}</span>
        </div>
      </div>
    );
  };

  const RoleCellRenderer = (props: CustomCellRendererProps<UserItem>) => {
    const role = props.value;
    return (
      <div className="flex h-full items-center">
        <Badge
          variant={role === "ADMIN" ? "default" : "secondary"}
          className={
            role === "ADMIN"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground border"
          }
        >
          {role}
        </Badge>
      </div>
    );
  };

  const DateCellRenderer = (props: CustomCellRendererProps<UserItem>) => {
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

  const ScansCellRenderer = (props: CustomCellRendererProps<UserItem>) => {
    const count = props.value;
    return (
      <div className="flex h-full items-center justify-center">
        <Badge
          variant="outline"
          className="bg-background gap-1 px-2.5 py-0.5 font-normal shadow-sm"
        >
          <Activity className="text-primary h-3.5 w-3.5" />
          <span className="text-primary font-bold">{count}</span> ครั้ง
        </Badge>
      </div>
    );
  };

  // useCallback: ตารางสร้างคอลัมน์ใหม่เฉพาะเมื่อสถานะที่ปุ่มลบใช้เปลี่ยน
  const ActionCellRenderer = useCallback(
    (props: CustomCellRendererProps<UserItem>) => {
      const user = props.data;
      if (!user) return null;
      if (user.id === currentUserId) return null;

      return (
        <div className="flex h-full items-center justify-center">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`hover:text-destructive h-8 w-8 rounded-md`}
                  onClick={() =>
                    handleDeleteUser(user.id, user.name || user.email)
                  }
                  disabled={
                    isDeleting === user.id ||
                    isBatchDeleting ||
                    user.id === currentUserId ||
                    user.role === "ADMIN"
                  }
                >
                  {isDeleting === user.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>ลบบัญชีผู้ใช้</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
    [currentUserId, isDeleting, isBatchDeleting, handleDeleteUser],
  );

  // Column Definitions
  const colDefs = useMemo<ColDef<UserItem>[]>(
    () => [
      {
        headerName: "ผู้ใช้งาน",
        field: "name",
        flex: 2,
        minWidth: 350,
        cellRenderer: UserCellRenderer,
        filter: "agTextColumnFilter",
        filterValueGetter: (params) => {
          if (!params.data) return "";
          return `${params.data.name || ""} ${params.data.email || ""}`;
        },
        getQuickFilterText: (params) => {
          if (!params.data) return params.value;
          return `${params.data.name || ""} ${params.data.email || ""}`;
        },
      },
      {
        headerName: "อีเมล",
        field: "email",
        hide: true,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "สิทธิ์การใช้งาน",
        field: "role",
        flex: 1,
        minWidth: 180,
        cellRenderer: RoleCellRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "วันที่สมัคร",
        field: "createdAt",
        flex: 1.5,
        minWidth: 220,
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
        headerName: "ประวัติการสแกน",
        field: "_count.analyses",
        flex: 1,
        minWidth: 180,
        cellRenderer: ScansCellRenderer,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "จัดการ",
        field: "id",
        flex: 0.5,
        minWidth: 120,
        cellRenderer: ActionCellRenderer,
        sortable: false,
        filter: false,
      },
    ],
    [ActionCellRenderer],
  );

  return (
    <div className="flex h-[600px] flex-col space-y-4">
      <DataGridToolbar
        searchValue={quickFilterText}
        onSearchChange={setQuickFilterText}
        searchPlaceholder="ค้นหาชื่อ หรืออีเมล..."
        totalItems={users.length}
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
        isRowSelectable={(node) =>
          !!node.data &&
          node.data.id !== currentUserId &&
          node.data.role !== "ADMIN"
        }
      />

      {/* Single Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={!!userToDelete}
        itemName={userToDelete?.name || null}
        isDeleting={isDeleting !== null}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDeleteUser}
        title="ยืนยันการลบบัญชีผู้ใช้"
        description={
          <>
            คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี{" "}
            <span className="text-foreground font-semibold">
              {userToDelete?.name}
            </span>{" "}
            ถาวร?
            ข้อมูลบัญชีและประวัติการสแกนทั้งหมดของบัญชีนี้จะถูกลบออกจากเครื่องเซิร์ฟเวอร์
            และไม่สามารถกู้คืนได้
          </>
        }
      />

      {/* Batch Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={showBatchDeleteDialog}
        itemName={`${selectedUsers.length} รายการ`}
        isDeleting={isBatchDeleting}
        onClose={() => setShowBatchDeleteDialog(false)}
        onConfirm={confirmBatchDelete}
        title="ยืนยันการลบผู้ใช้ที่เลือก"
        description={
          <div className="space-y-2">
            <p>
              คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ใช้ที่เลือกจำนวน{" "}
              <span className="text-foreground font-semibold">
                {selectedUsers.length}
              </span>{" "}
              บัญชี ถาวร? ข้อมูลทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้
            </p>
            <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-sm">
              {selectedUsers.map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
          </div>
        }
      />
    </div>
  );
}
