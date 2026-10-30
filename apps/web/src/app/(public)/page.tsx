import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  ClipboardList,
  Upload,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { calculateSeverity } from "@/lib/services/analyze-logic";
import {
  ACNE_CARE_ADVICE,
  ACNE_COLORS,
  ACNE_LABELS,
  SEVERITY_LABELS,
} from "@/types/analyze";
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
  {
    icon: BookOpen,
    title: "อ่านคำแนะนำก่อนเริ่ม",
    desc: "รู้วิธีดูแลผิวองค์รวมเบื้องต้น ทั้งการนอน ความเครียด และอาหาร ก่อนเข้าสู่การวิเคราะห์",
  },
  {
    icon: Upload,
    title: "อัปโหลดรูปใบหน้า",
    desc: "ถ่ายในที่แสงสว่างพอ เห็นผิวชัด ไฟล์ JPEG หรือ PNG ขนาดไม่เกิน 10 MB",
  },
  {
    icon: ClipboardList,
    title: "ดูผลและคำแนะนำ",
    desc: "เห็นกรอบสีแยกชนิดสิวบนรูป ระดับความรุนแรง คำแนะนำ และย้อนดูประวัติกับสถิติของตัวเองได้",
  },
];

const FAQ = [
  {
    q: "ผลจาก AI ใช้แทนการวินิจฉัยของแพทย์ได้ไหม",
    a: "ไม่ได้ ผลเป็นการประเมินเบื้องต้นเท่านั้น ใช้ประกอบการตัดสินใจว่าควรไปพบแพทย์หรือไม่",
  },
  {
    q: "ควรถ่ายรูปแบบไหนให้ได้ผลดี",
    a: "ถ่ายหน้าตรงในที่แสงธรรมชาติ ไม่ใช้ฟิลเตอร์ ไม่แต่งหน้า และให้ผิวอยู่ในโฟกัส",
  },
  {
    q: "รูปของฉันถูกเก็บไว้อย่างไร",
    a: "รูปผูกกับบัญชีของคุณ เปิดดูได้เฉพาะเจ้าของรูปและผู้ดูแลระบบ และลบประวัติเองได้",
  },
  {
    q: "ต้องสมัครสมาชิกก่อนไหม",
    a: "ต้องเข้าสู่ระบบเพื่อวิเคราะห์และบันทึกประวัติ สมัครด้วยอีเมลหรือเข้าด้วยบัญชี Google ได้",
  },
];

function SectionHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <span className="text-primary text-sm font-semibold">{eyebrow}</span>
      <h2 className="text-3xl md:text-4xl">{title}</h2>
      {desc && <p className="text-muted-foreground text-lg">{desc}</p>}
    </div>
  );
}

export default async function HomePage() {
  // หน้าสาธารณะ: ฐานข้อมูลล่มก็ยังเปิดหน้าได้ แค่ไม่มีค่าประเมิน
  const activeModel = await prisma.aiModel
    .findFirst({
      where: { isActive: true },
      select: {
        name: true,
        version: true,
        mAP50: true,
        precision: true,
        recall: true,
        f1Score: true,
        accuracy: true,
      },
    })
    .catch(() => null);
  // ผลตัวอย่างในภาพหลัก คำนวณจากกรอบจริงของภาพด้วยเกณฑ์เดียวกับระบบ
  const hero = ACNE_SAMPLES.hero;
  const counts: Record<string, number> = {};
  for (const b of hero.boxes) counts[b.cls] = (counts[b.cls] ?? 0) + 1;
  const severity = calculateSeverity(counts);
  const severityInfo = SEVERITY_INFO.find((s) => s.key === severity)!;

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <span className="bg-primary/10 text-primary self-start rounded-full px-3 py-1 text-sm font-medium">
            ประเมินผิวเบื้องต้นด้วย AI · จำแนกสิว 6 ชนิด
          </span>
          <h1 className="text-4xl leading-tight font-extrabold md:text-5xl lg:text-6xl">
            รู้จักสิวของคุณ <br />
            <span className="text-primary">ก่อนเลือกวิธีดูแล</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg">
            ถ่ายรูปใบหน้าแล้วอัปโหลด AcneAI จะตรวจหาและแยกชนิดสิวทั้ง 6 แบบ
            บอกระดับความรุนแรง พร้อมคำแนะนำการดูแลผิว
            และเก็บประวัติไว้ติดตามผลได้
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full px-7 text-base"
            >
              <Link href="/analyze">
                อัปโหลดรูปเพื่อวิเคราะห์ <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full px-7 text-base"
            >
              <Link href="/knowledge">อ่านความรู้ดูแลผิว</Link>
            </Button>
          </div>
          <ul className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              "รองรับไฟล์ JPEG และ PNG",
              "รู้ผลภายในไม่กี่วินาที",
              "เข้าสู่ระบบด้วย Google ได้",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CircleCheck
                  className="text-primary h-4 w-4"
                  aria-hidden="true"
                />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <figure className="bg-card overflow-hidden rounded-3xl border shadow-xl">
          <SampleImage
            src={hero.src}
            boxes={hero.boxes}
            alt="ตัวอย่างภาพใบหน้าพร้อมกรอบแยกชนิดสิว"
            priority
            className="aspect-[4/3]"
          />
          <figcaption className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-muted-foreground text-xs">
                  ตัวอย่างผลการประเมิน
                </p>
                <p className="text-2xl font-semibold">
                  {SEVERITY_LABELS[severity].label}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${severityInfo.tone}`}
              >
                {severityInfo.en}
              </span>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              {ACNE_GROUPS.map((g) => (
                <div key={g.key} className="bg-muted/60 rounded-xl px-3 py-2">
                  <dt className="text-muted-foreground text-xs">{g.label}</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {g.types.reduce((sum, t) => sum + (counts[t] ?? 0), 0)}
                  </dd>
                </div>
              ))}
            </dl>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {Object.entries(counts).map(([cls, n]) => (
                <li key={cls} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: ACNE_COLORS[cls] }}
                  />
                  {ACNE_LABELS[cls]}{" "}
                  <span className="text-muted-foreground">{n}</span>
                </li>
              ))}
            </ul>
            <p className="text-foreground/80 border-t pt-3 text-sm leading-relaxed">
              {ACNE_CARE_ADVICE[severity]}
            </p>
            <p className="text-muted-foreground text-xs">
              จากภาพจริงในชุดข้อมูลที่ใช้ฝึกโมเดล
            </p>
          </figcaption>
        </figure>
      </section>

      {/* How it works */}
      <section className="bg-card border-y">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16">
          <SectionHeading
            eyebrow="ใช้งานง่าย 3 ขั้นตอน"
            title="จากรูปถ่าย สู่คำแนะนำดูแลผิว"
          />
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="bg-background flex flex-col gap-3 rounded-2xl border p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-muted-foreground text-sm font-semibold">
                    ขั้นที่ {i + 1}
                  </span>
                </div>
                <h3 className="text-xl">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6 acne types */}
      <section
        id="types"
        className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-16"
      >
        <SectionHeading
          eyebrow="ความรู้เรื่องสิว"
          title="สิว 6 ชนิดที่ AcneAI ตรวจจับได้"
          desc="แบ่งเป็น 3 กลุ่มตามความลึกของการอักเสบ ซึ่งเป็นเกณฑ์ที่ระบบใช้ประเมินความรุนแรง ภาพทั้งหมดเป็นภาพจริงพร้อมกรอบสีแบบเดียวกับผลวิเคราะห์"
        />
        <AcneTypeGrid />
      </section>

      {/* Model metrics */}
      <section id="model" className="bg-card scroll-mt-20 border-y">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16">
          <SectionHeading
            eyebrow="ประสิทธิภาพโมเดล"
            title="ความแม่นยำของ AI ที่ใช้งานอยู่"
            desc="โมเดล YOLO ที่ฝึกด้วยภาพสิว 6 ชนิด วัดผลด้วยตัวชี้วัดมาตรฐานของงานตรวจจับวัตถุ"
          />
          <ModelMetrics model={activeModel} />
        </div>
      </section>

      {/* Severity */}
      <section
        id="severity"
        className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-4 py-16"
      >
        <SectionHeading
          eyebrow="เกณฑ์การประเมิน"
          title="ระบบประเมินความรุนแรง 3 ระดับ"
          desc="ดูจากชนิดและจำนวนสิวที่ตรวจพบ แล้วให้คำแนะนำตามระดับ"
        />
        <SeverityLevels />
      </section>

      {/* Holistic care */}
      <section className="bg-accent/40 border-y">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="ดูแลผิวแบบองค์รวม"
              title="ผิวดีเริ่มจากชีวิตประจำวัน"
            />
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/knowledge">
                อ่านความรู้ทั้งหมด <ArrowRight />
              </Link>
            </Button>
          </div>
          <HolisticCare />
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="mx-auto flex max-w-3xl scroll-mt-20 flex-col gap-8 px-4 py-16"
      >
        <h2 className="text-center text-3xl md:text-4xl">คำถามที่พบบ่อย</h2>
        <div className="flex flex-col gap-3">
          {FAQ.map((item, i) => (
            <details
              key={item.q}
              open={i === 0}
              className="group bg-card rounded-2xl border px-5 py-4"
            >
              <summary className="cursor-pointer list-none text-lg font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="text-muted-foreground mt-3">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Disclaimer (ข้อ 1.4.1) + CTA */}
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16">
        <MedicalDisclaimer className="text-sm" />
        <div className="bg-primary text-primary-foreground flex flex-wrap items-center justify-between gap-6 rounded-3xl px-8 py-12 md:px-12">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 className="text-3xl">พร้อมรู้จักผิวของคุณหรือยัง</h2>
            <p className="text-primary-foreground/80">
              อัปโหลดรูปแรกแล้วดูผลได้ทันที พร้อมเก็บประวัติไว้เทียบผลการดูแล
            </p>
          </div>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-12 rounded-full px-7 text-base"
          >
            <Link href="/analyze">เริ่มวิเคราะห์ผิว</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
