import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  itemName: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
}

export function ConfirmDeleteDialog({
  isOpen,
  itemName,
  isDeleting,
  onClose,
  onConfirm,
  title = "ยืนยันการลบ",
  description,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => !open && !isDeleting && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title} {itemName ? `"${itemName}"` : ""}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground mt-2">
              {description || (
                <>
                  คุณแน่ใจหรือไม่ว่าต้องการลบ{" "}
                  <span className="font-semibold text-foreground">
                    {itemName}
                  </span>{" "}
                  ถาวร? ข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
            ยกเลิก
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e: React.FormEvent) => {
              e.preventDefault();
              onConfirm();
            }}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            ลบทิ้งถาวร
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
