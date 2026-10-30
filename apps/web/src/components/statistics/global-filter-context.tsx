"use client";

import React, { createContext, useContext, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface GlobalFilterContextType {
  dateRange: DateRange;
}

const GlobalFilterContext = createContext<GlobalFilterContextType | undefined>(
  undefined,
);

function GlobalFilterProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const dateRange = useMemo<DateRange>(
    () => ({
      from: start ? new Date(start) : undefined,
      to: end ? new Date(end) : undefined,
    }),
    [start, end],
  );

  return (
    <GlobalFilterContext.Provider value={{ dateRange }}>
      {children}
    </GlobalFilterContext.Provider>
  );
}

export function GlobalFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <GlobalFilterContext.Provider
          value={{ dateRange: { from: undefined, to: undefined } }}
        >
          {children}
        </GlobalFilterContext.Provider>
      }
    >
      <GlobalFilterProviderInner>{children}</GlobalFilterProviderInner>
    </Suspense>
  );
}

export function useGlobalFilter() {
  const context = useContext(GlobalFilterContext);
  if (context === undefined) {
    throw new Error(
      "useGlobalFilter must be used within a GlobalFilterProvider",
    );
  }
  return context;
}
