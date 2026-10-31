// ธีมสีของเว็บ — ค่าสีจริงอยู่ใน globals.css ([data-palette="..."])
// ชุดแรกคือค่าเริ่มต้น
export const PALETTES = [
  { key: "clinic", label: "ฟ้า", swatch: "hsl(211 72% 44%)" },
  { key: "rose", label: "ชมพูโรส", swatch: "hsl(346 58% 50%)" },
  { key: "mint", label: "เขียวมิ้นต์", swatch: "hsl(172 62% 31%)" },
  { key: "lavender", label: "ม่วงลาเวนเดอร์", swatch: "hsl(258 46% 54%)" },
  { key: "peach", label: "ส้มพีช", swatch: "hsl(20 72% 44%)" },
] as const;

export type PaletteKey = (typeof PALETTES)[number]["key"];

export const DEFAULT_PALETTE: PaletteKey = "clinic";
export const PALETTE_STORAGE_KEY = "acneai-palette";

export function isPaletteKey(value: unknown): value is PaletteKey {
  return PALETTES.some((p) => p.key === value);
}

// รันใน <head> ก่อนหน้าเว็บแสดง กันสีกะพริบตอนโหลด
export const PALETTE_INIT_SCRIPT = `try{var p=localStorage.getItem("${PALETTE_STORAGE_KEY}");if(p&&${JSON.stringify(
  PALETTES.map((p) => p.key),
)}.indexOf(p)>-1)document.documentElement.dataset.palette=p}catch(e){}`;
