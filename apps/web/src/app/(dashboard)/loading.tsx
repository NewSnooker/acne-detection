// แสดงทันทีระหว่างรอข้อมูลของหน้าในแดชบอร์ด (เมนูด้านข้างยังอยู่)
export default function DashboardLoading() {
  return (
    <div
      className="mx-auto flex max-w-6xl animate-pulse flex-col gap-6"
      role="status"
      aria-label="กำลังโหลด"
    >
      <div className="space-y-2">
        <div className="bg-muted h-7 w-56 rounded-md" />
        <div className="bg-muted h-4 w-80 max-w-full rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted h-24 rounded-xl" />
        ))}
      </div>
      <div className="bg-muted h-80 rounded-xl" />
      <span className="sr-only">กำลังโหลด...</span>
    </div>
  );
}
