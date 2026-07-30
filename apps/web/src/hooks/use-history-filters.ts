import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function useHistoryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilters = (key: string, value: string | string[]) => {
    const params = new URLSearchParams(searchParams);

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(","));
      } else {
        params.delete(key);
      }
    } else {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleResetFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("sort");
    params.delete("search");
    params.delete("date");
    params.delete("types");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const currentSearch = searchParams.get("search") || "";
  const currentDate = searchParams.get("date") || "";
  const currentTypes = searchParams.get("types")
    ? searchParams.get("types")!.split(",")
    : [];

  return {
    updateFilters,
    handleResetFilters,
    currentSearch,
    currentDate,
    currentTypes,
  };
}
