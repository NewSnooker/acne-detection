import { Loader2 } from "lucide-react";

interface TableLoadingProps {
  message?: string;
}

export function TableLoading({
  message = "กำลังโหลดข้อมูล...",
}: TableLoadingProps) {
  return (
    <div className="bg-muted/20 text-muted-foreground flex h-[500px] w-full flex-col items-center justify-center rounded-xl border shadow-sm">
      <Loader2 className="text-primary mb-4 h-8 w-8 animate-spin" />
      <p>{message}</p>
    </div>
  );
}
