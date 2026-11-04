// log เวลาต่อคำขอ — รูปแบบเดียวกับฝั่ง ai (apps/ai/app/request_log.py)
// 1 คำขอ = 1 บรรทัด: `analyze timing [<request id>]: auth 0.05s | ... | total 2.97s | ...`
// ค้น request id ใน log จะเจอทั้งบรรทัดของเว็บและ ai — ดูวิธีอ่านที่ dev-docs/performance/web.md

const REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

/** ช้ากว่านี้พิมพ์เป็น warn ให้กรองหาได้ง่าย */
export const SLOW_REQUEST_MS = 10_000;

/** ใช้ id ที่ส่งมา (เช่น x-request-id ที่ ingress ของ Azure ใส่ให้) ถ้ารูปแบบถูก ไม่งั้นสร้างใหม่ */
export const requestIdFrom = (headers: Headers): string => {
  const incoming = headers.get("x-request-id");
  if (incoming && REQUEST_ID.test(incoming)) return incoming;
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
};

export type ServerTimingEntry = { name: string; ms: number };

/** อ่าน header Server-Timing (W3C) เช่น `image;dur=40, total;dur=1910` */
export const parseServerTiming = (
  header: string | null,
): ServerTimingEntry[] => {
  if (!header) return [];
  return header.split(",").flatMap((part) => {
    const [name, ...params] = part.trim().split(";");
    const dur = params
      .map((param) => param.trim().match(/^dur=([\d.]+)$/))
      .find((match) => match !== null);
    if (!name || !dur) return [];
    return [{ name, ms: Number(dur[1]) }];
  });
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

type Step = { name: string; ms: number; note?: string };

export type StepTimer = {
  /** เริ่มขั้น name (ขั้นก่อนหน้าจบตรงนี้) */
  step: (name: string) => void;
  /** จบขั้นสุดท้าย */
  done: () => void;
  /** แนบข้อความต่อท้ายขั้นที่กำลังทำ เช่นเวลาที่ ai รายงานมา */
  note: (text: string) => void;
  /** เวลาเพิ่มเติมสำหรับ Server-Timing ที่ไม่ได้จับเอง (เช่นขั้นข้างใน ai) */
  addServerTiming: (entries: ServerTimingEntry[]) => void;
  /** ขั้นที่กำลังทำ (ตอนล้มเหลว = ขั้นที่พัง) */
  current: () => string | null;
  /** เวลาที่ผ่านไปของขั้นที่กำลังทำ (ms) */
  elapsedInStep: () => number;
  totalMs: () => number;
  /** `auth 0.05s | upload azure-blob 0.30s | total 0.40s` */
  summary: () => string;
  /** header Server-Timing ให้เบราว์เซอร์ (DevTools → Network → Timing) */
  serverTiming: () => string;
};

export const createStepTimer = (
  now: () => number = () => performance.now(),
): StepTimer => {
  const start = now();
  const steps: Step[] = [];
  const extra: ServerTimingEntry[] = [];
  let open: { name: string; start: number; note?: string } | null = null;

  // ขั้นก่อนหน้าจบเวลาเดียวกับที่ขั้นถัดไปเริ่ม — ไม่มีช่องว่างระหว่างขั้น
  const close = (at: number) => {
    if (!open) return;
    steps.push({ name: open.name, ms: at - open.start, note: open.note });
    open = null;
  };

  return {
    step: (name) => {
      const at = now();
      close(at);
      open = { name, start: at };
    },
    done: () => close(now()),
    note: (text) => {
      if (open) open.note = text;
    },
    addServerTiming: (entries) => extra.push(...entries),
    current: () => open?.name ?? null,
    elapsedInStep: () => (open ? now() - open.start : 0),
    totalMs: () => now() - start,
    summary: () =>
      [
        ...steps.map(
          (s) => `${s.name} ${seconds(s.ms)}${s.note ? ` (${s.note})` : ""}`,
        ),
        `total ${seconds(now() - start)}`,
      ].join(" | "),
    serverTiming: () =>
      [
        ...steps.map((s) => ({ name: s.name, ms: s.ms })),
        ...extra,
        { name: "total", ms: now() - start },
      ]
        // ชื่อใน Server-Timing ห้ามมีช่องว่าง
        .map((s) => `${s.name.replace(/\s+/g, "-")};dur=${Math.round(s.ms)}`)
        .join(", "),
  };
};

/** เวลาที่หายไประหว่างทาง = ai request (เว็บวัด) − total (ai วัด) = เครือข่าย + ai ตื่นจาก scale-to-zero */
export const describeAiGap = (
  aiEntries: ServerTimingEntry[],
  requestMs: number,
): string | null => {
  const aiTotal = aiEntries.find((e) => e.name === "total");
  if (!aiTotal) return null;
  return `network/wake ${seconds(Math.max(0, requestMs - aiTotal.ms))}`;
};
