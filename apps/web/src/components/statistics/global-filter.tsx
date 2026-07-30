"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, subDays } from "date-fns";
import { Suspense } from "react";

function GlobalFilterInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentStart = searchParams.get("start");
  
  // Determine current value for the select based on start param
  let value = "all";
  if (currentStart) {
    const today = new Date();
    const start = new Date(currentStart);
    const diffDays = Math.round((today.getTime() - start.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays <= 7 && diffDays > 0) value = "7days";
    else if (diffDays <= 30 && diffDays > 7) value = "30days";
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    const today = new Date();
    
    if (val === "all") {
      params.delete("start");
      params.delete("end");
    } else if (val === "7days") {
      params.set("start", format(subDays(today, 7), "yyyy-MM-dd"));
      params.set("end", format(today, "yyyy-MM-dd"));
    } else if (val === "30days") {
      params.set("start", format(subDays(today, 30), "yyyy-MM-dd"));
      params.set("end", format(today, "yyyy-MM-dd"));
    }
    
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-muted-foreground">ช่วงเวลา:</span>
      <select 
        className="bg-background border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        onChange={handleFilterChange}
        value={value}
      >
        <option value="all">ทั้งหมด</option>
        <option value="7days">7 วันล่าสุด</option>
        <option value="30days">30 วันล่าสุด</option>
      </select>
    </div>
  );
}

export function GlobalFilter() {
  return (
    <Suspense fallback={<div className="h-9 w-40 bg-muted animate-pulse rounded-md" />}>
      <GlobalFilterInner />
    </Suspense>
  );
}
