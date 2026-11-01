"use client";

import { ErrorView } from "@/components/layout/error-view";

// อยู่ใต้ layout ของแดชบอร์ด จึงยังเห็นเมนูด้านข้าง
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorView error={error} retry={unstable_retry} homeHref="/analyze" />;
}
