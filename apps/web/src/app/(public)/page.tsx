import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { calculateSeverity } from "@/lib/services/analyze-logic";
import { ACNE_CARE_ADVICE, ACNE_COLORS, ACNE_LABELS, SEVERITY_LABELS } from "@/types/analyze";
import { Button } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/analyze/medical-disclaimer";
import { AcneTypeGrid } from "@/components/knowledge/acne-type-grid";
import { HolisticCare } from "@/components/knowledge/holistic-care";
import { ModelMetrics } from "@/components/knowledge/model-metrics";
import { SeverityLevels } from "@/components/knowledge/severity-levels";
import { SampleImage } from "@/components/knowledge/sample-image";
import { ACNE_SAMPLES } from "@/components/knowledge/acne-samples";
import { ACNE_GROUPS, SEVERITY_INFO } from "@/components/knowledge/content";

const STEPS = [
  { title: "อ่านคำแนะนำ", desc: "ดูแลผิวองค์รวม การนอน ความเครียด อาหาร" },
  { title: "อัปโหลดรูป", desc: "ไฟล์ JPEG หรือ PNG ไม่เกิน 10 MB" },
  { title: "ดูผล", desc: "ชนิดสิว ระดับความรุนแรง และคำแนะนำ" },
];

const FAQ = [
  { q: "ผลจาก AI ใช้แทนการวินิจฉัยของแพทย์ได้ไหม", a: "ไม่ได้ ผลเป็นการประเมินเบื้องต้น ใช้ช่วยตัดสินใจว่าควรไปพบแพทย์หรือไม่" },
  { q: "ถ่ายรูปแบบไหนให้ได้ผลดี", a: "หน้าตรง แสงธรรมชาติ ไม่ใช้ฟิลเตอร์ ไม่แต่งหน้า และให้ผิวอยู่ในโฟกัส" },
  { q: "รูปของฉันถูกเก็บไว้อย่างไร", a: "รูปผูกกับบัญชีของคุณ เปิดดูได้เฉพาะคุณและผู้ดูแลระบบ และลบประวัติเองได้" },
  { q: "ต้องสมัครสมาชิกไหม", a: "ต้องเข้าสู่ระบบก่อนวิเคราะห์ สมัครด้วยอีเมลหรือใช้บัญชี Google ได้" },
];

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      {children && <p className="max-w-xl text-lg text-muted-foreground">{children}</p>}
    </div>
  );
}

export default async function HomePage() {
  // หน้าสาธารณะ: ฐานข้อมูลล่มก็ยังเปิดหน้าได้ แค่ไม่มีค่าประเมิน
  const activeModel = await prisma.aiModel
    .findFirst({
      where: { isActive: true },
      select: { name: true, version: true, mAP50: true, precision: true, recall: true, f1Score: true, accuracy: true },
    })
    .catch(() => null);

  // ผลตัวอย่างในภาพหลัก คำนวณจากกรอบจริงของภาพด้วยเกณฑ์เดียวกับระบบ
  const hero = ACNE_SAMPLES.hero;
  const counts: Record<string, number> = {};
  for (const b of hero.boxes) counts[b.cls] = (counts[b.cls] ?? 0) + 1;
  const severity = calculateSeverity(counts);
  const severityTone = SEVERITY_INFO.find((s) => s.key === severity)!.tone;

  return (
    <>
      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 pt-16 text-center md:pt-24">
        <p className="text-sm font-medium text-primary">AI ประเมินสิวเบื้องต้นจากรูปถ่าย</p>
        <h1 className="max-w-3xl text-balance text-5xl font-bold leading-[1.15] tracking-tight md:text-7xl">
          รู้จักสิวของคุณ
          <br />
          <span className="text-muted-foreground">ในไม่กี่วินาที</span>
        </h1>
        <p className="max-w-xl text-balance text-lg text-muted-foreground md:text-xl">
          อัปโหลดรูปใบหน้า แล้วดูว่ามีสิวชนิดไหน รุนแรงระดับใด พร้อมคำแนะนำการดูแล
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Button asChild size="lg" className="h-12 rounded-full px-7 text-base">
            <Link href="/analyze">เริ่มวิเคราะห์ผิว</Link>
          </Button>
          <Link href="/knowledge" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            อ่านวิธีดูแลผิว <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ภาพหลัก: ตัวอย่างผลวิเคราะห์จริง */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-14 md:pb-28">
        <figure className="rounded-[2.5rem] bg-primary/[0.06] p-3 md:p-6">
          <div className="grid overflow-hidden rounded-[2rem] border bg-card md:grid-cols-[1.35fr_1fr]">
            <SampleImage src={hero.src} boxes={hero.boxes} alt="ตัวอย่างภาพใบหน้าพร้อมกรอบแยกชนิดสิว" priority />
            <div className="flex flex-col gap-8 p-6 text-left md:p-10">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">ผลการประเมิน</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-semibold tracking-tight">{SEVERITY_LABELS[severity].label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityTone}`}>
                    {SEVERITY_INFO.find((s) => s.key === severity)!.en}
                  </span>
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-3 border-y py-6">
                {ACNE_GROUPS.map((g) => (
                  <div key={g.key} className="flex flex-col gap-1">
                    <dt className="text-xs text-muted-foreground">{g.label}</dt>
                    <dd className="text-2xl font-semibold tabular-nums">
                      {g.types.reduce((sum, t) => sum + (counts[t] ?? 0), 0)}
                    </dd>
                  </div>
                ))}
              </dl>
              <ul className="flex flex-col gap-3 text-sm">
                {Object.entries(counts).map(([cls, n]) => (
                  <li key={cls} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: ACNE_COLORS[cls] }} />
                      {ACNE_LABELS[cls]}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{n} จุด</span>
                  </li>
                ))}
              </ul>
              <p className="mt-auto rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed text-foreground/80">
                {ACNE_CARE_ADVICE[severity].replace("⚠️ ", "")}
              </p>
            </div>
          </div>
          <figcaption className="px-2 pt-4 text-center text-xs text-muted-foreground">
            ตัวอย่างจากภาพจริงในชุดข้อมูลที่ใช้ฝึกโมเดล
          </figcaption>
        </figure>

        <ol className="mt-14 grid gap-8 text-left sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="text-sm font-semibold tabular-nums text-primary">0{i + 1}</span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* สิว 6 ชนิด */}
      <section id="types" className="scroll-mt-20 border-t bg-card/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-20 md:py-28">
          <SectionTitle eyebrow="ชนิดของสิว" title="AI แยกสิวได้ 6 ชนิด">
            แบ่งเป็น 3 กลุ่มตามความลึกของการอักเสบ ซึ่งใช้ประเมินความรุนแรง
          </SectionTitle>
          <AcneTypeGrid />
        </div>
      </section>

      {/* ค่าประเมินโมเดล */}
      <section id="model" className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-12 px-4 py-20 md:py-28">
        <SectionTitle eyebrow="ความแม่นยำ" title="วัดผลด้วยตัวชี้วัดมาตรฐาน">
          ค่าจากการทดสอบโมเดล YOLO ที่ระบบใช้งานอยู่
        </SectionTitle>
        <ModelMetrics model={activeModel} />
      </section>

      {/* ความรุนแรง */}
      <section id="severity" className="scroll-mt-20 border-t bg-card/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-20 md:py-28">
          <SectionTitle eyebrow="ระดับความรุนแรง" title="ประเมินจากชนิดและจำนวนสิว" />
          <SeverityLevels />
        </div>
      </section>

      {/* ดูแลผิวองค์รวม */}
      <section className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTitle eyebrow="ดูแลผิวแบบองค์รวม" title="ผิวดีเริ่มจากชีวิตประจำวัน" />
          <Link href="/knowledge" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            อ่านทั้งหมด <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <HolisticCare />
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1fr_1.6fr] md:py-28">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">คำถามที่พบบ่อย</h2>
          <div className="divide-y border-y">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden="true" className="text-2xl font-light text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ข้อจำกัด (ข้อ 1.4.1) + ปิดท้าย */}
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-20">
        <div className="flex flex-col items-center gap-6 rounded-[2.5rem] bg-foreground px-6 py-16 text-center text-background md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">พร้อมรู้จักผิวของคุณหรือยัง</h2>
          <p className="max-w-md text-background/70">อัปโหลดรูปแรก ดูผลได้ทันที และเก็บประวัติไว้เทียบผลการดูแล</p>
          <Button asChild size="lg" variant="secondary" className="h-12 rounded-full px-7 text-base">
            <Link href="/analyze">เริ่มวิเคราะห์ผิว</Link>
          </Button>
        </div>
        <MedicalDisclaimer className="text-sm" />
      </section>
    </>
  );
}
