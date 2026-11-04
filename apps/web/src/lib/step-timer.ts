// จับเวลาทีละขั้นของงานหนึ่งงาน แล้วพิมพ์เป็น log บรรทัดเดียว
// รูปแบบเดียวกับ log "predict timing" ฝั่ง ai: "ชื่อขั้น 0.12s | ... | total 0.50s"

export type StepTimer = {
  /** จบขั้นที่ชื่อ name — เวลานับจากขั้นก่อนหน้า (หรือจากตอนสร้าง timer) */
  mark: (name: string) => void;
  /** ทุกขั้นที่ mark แล้ว + total ตั้งแต่สร้าง timer */
  summary: () => string;
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

export const createStepTimer = (
  now: () => number = () => performance.now(),
): StepTimer => {
  const start = now();
  let last = start;
  const steps: string[] = [];

  return {
    mark: (name) => {
      const current = now();
      steps.push(`${name} ${seconds(current - last)}`);
      last = current;
    },
    summary: () => [...steps, `total ${seconds(now() - start)}`].join(" | "),
  };
};
