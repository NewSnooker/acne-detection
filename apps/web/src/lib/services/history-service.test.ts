import { beforeEach, describe, expect, it, vi } from "vitest";

// ประวัติการวิเคราะห์ (ขอบเขตข้อ 1.3.2.5) — ตัวกรอง/นับชนิดสิว และการลบ
const m = vi.hoisted(() => ({
  analysisFindMany: vi.fn(),
  imageDeleteMany: vi.fn(),
  deleteImage: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    analysis: { findMany: m.analysisFindMany },
    image: { deleteMany: m.imageDeleteMany },
  },
}));
vi.mock("@/lib/storage/image-provider", () => ({ deleteImage: m.deleteImage }));

import {
  countImagesByType,
  deleteHistories,
  filterHistory,
  getHistory,
  toOrderBy,
  type FilterableAnalysis,
} from "./history-service";
import { readCounts } from "@/lib/acne-counts";

const row = (over: Partial<FilterableAnalysis> = {}): FilterableAnalysis => ({
  counts: { papule: 2, blackhead: 0 },
  total: 2,
  severity: "MILD",
  createdAt: new Date(2026, 9, 5, 12),
  model: { name: "YOLO26", version: "v1" },
  ...over,
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  Object.values(m).forEach((fn) => fn.mockReset());
});

describe("readCounts", () => {
  it("คืนเฉพาะค่าที่เป็นตัวเลข และรับค่าแปลกได้", () => {
    expect(readCounts({ papule: 1, bad: "x" })).toEqual({ papule: 1 });
    expect(readCounts(null)).toEqual({});
    expect(readCounts([1, 2])).toEqual({});
  });
});

describe("toOrderBy", () => {
  it("ค่าไม่รู้จักใช้ล่าสุดก่อน", () => {
    expect(toOrderBy("acne_asc")).toEqual({ total: "asc" });
    expect(toOrderBy("hack")).toEqual({ createdAt: "desc" });
    expect(toOrderBy(undefined)).toEqual({ createdAt: "desc" });
  });
});

describe("countImagesByType", () => {
  it("นับจำนวนรูปต่อชนิด (ไม่ใช่จำนวนเม็ด) และรูปที่ไม่พบสิว", () => {
    expect(
      countImagesByType([
        row({ counts: { papule: 5, cyst: 1 }, total: 6 }),
        row({ counts: { papule: 1 }, total: 1 }),
        row({ counts: {}, total: 0 }),
      ]),
    ).toEqual({ papule: 2, cyst: 1, no_acne: 1 });
  });
});

describe("filterHistory", () => {
  const items = [
    row(),
    row({ counts: { cyst: 1 }, total: 1, severity: "SEVERE", model: null }),
    row({ counts: {}, total: 0, createdAt: new Date(2026, 9, 6, 9) }),
  ];

  it("ไม่มีเงื่อนไข = คืนทั้งหมด", () => {
    expect(filterHistory(items, {})).toHaveLength(3);
  });

  it("ค้นหาด้วยชื่อชนิดสิวที่พบจริงเท่านั้น", () => {
    expect(filterHistory(items, { search: "papule" })).toEqual([items[0]]);
    expect(filterHistory(items, { search: "blackhead" })).toEqual([]);
  });

  it("ค้นหาด้วยความรุนแรงภาษาไทยหรืออังกฤษ", () => {
    expect(filterHistory(items, { search: "รุนแรง" })).toEqual([items[1]]);
    expect(filterHistory(items, { search: "Severe" })).toEqual([items[1]]);
  });

  it("ค้นหาด้วยชื่อโมเดลและวันที่ DD/MM/YYYY", () => {
    expect(filterHistory(items, { search: "yolo26" })).toHaveLength(2);
    expect(filterHistory(items, { search: "06/10/2026" })).toEqual([items[2]]);
  });

  it("ค้นหาด้วยอีเมลผู้ใช้ (หน้าแอดมิน)", () => {
    const withUser = [
      row({ user: { name: "Ann", email: "ann@x.com" } }),
      row(),
    ];
    expect(filterHistory(withUser, { search: "ann@" })).toEqual([withUser[0]]);
  });

  it("กรองตามวัน", () => {
    expect(filterHistory(items, { date: "2026-10-06" })).toEqual([items[2]]);
  });

  it("กรองตามชนิด รวม no_acne", () => {
    expect(filterHistory(items, { types: ["cyst", "no_acne"] })).toEqual([
      items[1],
      items[2],
    ]);
  });
});

describe("getHistory", () => {
  const dbRow = (id: string, over: Partial<FilterableAnalysis> = {}) => ({
    id,
    ...row(over),
    detections: [],
    image: {
      id: `img-${id}`,
      fileName: `${id}.jpg`,
      url: null,
      provider: "local",
    },
  });

  it("ผู้ใช้ทั่วไปเห็นเฉพาะของตัวเอง และไม่ดึงข้อมูลผู้ใช้", async () => {
    m.analysisFindMany.mockResolvedValue([dbRow("a")]);
    const result = await getHistory({ userId: "u1" });
    const args = m.analysisFindMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "u1" });
    expect(args.include.user).toBeUndefined();
    expect(result.items[0]).not.toHaveProperty("user");
  });

  it("แอดมินเห็นทุกคน และไม่ดึง password ของผู้ใช้", async () => {
    m.analysisFindMany.mockResolvedValue([]);
    await getHistory({});
    const args = m.analysisFindMany.mock.calls[0][0];
    expect(args.where).toBeUndefined();
    expect(args.include.user.select.password).toBeUndefined();
  });

  it("typeCounts นับก่อนกรอง ส่วน total นับหลังกรอง และแบ่งหน้าได้", async () => {
    m.analysisFindMany.mockResolvedValue([
      dbRow("a"),
      dbRow("b", { counts: { cyst: 1 }, total: 1 }),
      dbRow("c"),
    ]);
    const result = await getHistory({
      userId: "u1",
      types: ["papule"],
      limit: 1,
      skip: 1,
    });
    expect(result.typeCounts).toEqual({ papule: 2, cyst: 1 });
    expect(result.total).toBe(2);
    expect(result.items.map((i) => i.id)).toEqual(["c"]);
  });
});

describe("deleteHistories", () => {
  it("ลบไฟล์รูปแล้วลบ Image (cascade ไป Analysis) แม้ลบไฟล์บางรูปไม่สำเร็จ", async () => {
    m.analysisFindMany.mockResolvedValue([
      {
        id: "a",
        image: { id: "i1", fileName: "1.jpg", provider: "local", url: null },
      },
      {
        id: "b",
        image: { id: "i2", fileName: "2.jpg", provider: "local", url: null },
      },
    ]);
    m.deleteImage.mockRejectedValueOnce(new Error("disk"));

    await expect(deleteHistories(["a", "b"])).resolves.toBe(2);
    expect(m.deleteImage).toHaveBeenCalledTimes(2);
    expect(m.imageDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["i1", "i2"] } },
    });
  });

  it("ไม่พบรายการ = คืน 0", async () => {
    m.analysisFindMany.mockResolvedValue([]);
    await expect(deleteHistories(["x"])).resolves.toBe(0);
  });
});
