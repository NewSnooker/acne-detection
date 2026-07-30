"use client";

import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import type { AgGridReact } from "ag-grid-react";
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

import { deleteUser, deleteUsers } from "@/app/actions/user-actions";
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

  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === currentUserId) return; // Safeguard
    setUserToDelete({ id: userId, name: userName });
  };

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
      const result = await deleteUser(userToDelete.id);
      if (result.error) {
        alert("เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้");
      } else {
        setRowData((prev) => prev.filter((u) => u.id !== userToDelete.id));
      }
    } catch (error) {
      console.error("Delete user error:", error);
      alert("เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้");
    } finally {
      setIsDeleting(null);
      setUserToDelete(null);
    }
  };

  const confirmBatchDelete = async () => {
    if (usersToDelete.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const result = await deleteUsers(usersToDelete);
      if (result.error) {
        alert(result.error);
      } else {
        setRowData((prev) => prev.filter((u) => !usersToDelete.includes(u.id)));
      }
    } catch (error) {
      console.error("Batch delete error:", error);
      alert("เกิดข้อผิดพลาดในการลบผู้ใช้งานหลายคน");
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
  const UserCellRenderer = (props: any) => {
    const user = props.data;
    if (!user) return null;
    return (
      <div className="flex items-center gap-3 h-full">
        <div className="h-8 w-8 rounded-full bg-muted overflow-hidden relative shrink-0 border shadow-sm flex items-center justify-center text-primary font-bold text-sm">
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
        <div className="flex flex-col leading-tight justify-center">
          <span className="text-sm font-bold text-foreground">
            {user.name || "ผู้ใช้ไม่ระบุชื่อ"}
          </span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </div>
    );
  };

  const RoleCellRenderer = (props: any) => {
    const role = props.value;
    return (
      <div className="flex items-center h-full">
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

  const ScansCellRenderer = (props: any) => {
    const count = props.value;
    return (
      <div className="flex items-center justify-center h-full">
        <Badge
          variant="outline"
          className="font-normal gap-1 px-2.5 py-0.5 bg-background shadow-sm"
        >
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="font-bold text-primary">{count}</span> ครั้ง
        </Badge>
      </div>
    );
  };

  const ActionCellRenderer = (props: any) => {
    const user = props.data;
    if (!user) return null;
    if (user.id === currentUserId) return null;

    return (
      <div className="flex items-center justify-center h-full">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-md hover:text-destructive h-8 w-8`}
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
  };

  // Column Definitions
  const colDefs = useMemo<any[]>(
    () => [
      {
        headerName: "ผู้ใช้งาน",
        field: "name",
        flex: 2,
        minWidth: 350,
        cellRenderer: UserCellRenderer,
        filter: "agTextColumnFilter",
        filterValueGetter: (params: any) => {
          if (!params.data) return params.data?.name || "";
          return `${params.data.name || ""} ${params.data.email || ""}`;
        },
        getQuickFilterText: (params: any) => {
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
    [currentUserId, isDeleting, isBatchDeleting],
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      floatingFilter: false,
      resizable: true,
    }),
    [],
  );

  return (
    <div className="space-y-4 h-[600px] flex flex-col">
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
            <span className="font-semibold text-foreground">
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
              <span className="font-semibold text-foreground">
                {selectedUsers.length}
              </span>{" "}
              บัญชี ถาวร? ข้อมูลทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้
            </p>
            <ul className="list-disc pl-5 text-sm max-h-32 overflow-y-auto">
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
