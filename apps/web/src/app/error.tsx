"use client";

import { ErrorView } from "@/components/layout/error-view";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <ErrorView error={error} retry={unstable_retry} />
    </main>
  );
}
