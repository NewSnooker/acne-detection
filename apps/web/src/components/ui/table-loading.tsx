import { Loader2 } from "lucide-react";

interface TableLoadingProps {
  message?: string;
}

export function TableLoading({
  message = "กำลังโหลดข้อมูล...",
}: TableLoadingProps) {
  return (
    <div className="h-[500px] w-full flex flex-col items-center justify-center border rounded-xl bg-muted/20 text-muted-foreground shadow-sm">
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
      <p>{message}</p>
    </div>
  );
}
