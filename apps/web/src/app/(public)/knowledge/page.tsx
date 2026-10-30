import Link from "next/link";
import { ArrowRight, CircleCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/analyze/medical-disclaimer";
import { AcneTypeGrid } from "@/components/knowledge/acne-type-grid";
import { HolisticCare } from "@/components/knowledge/holistic-care";
import { SeverityLevels } from "@/components/knowledge/severity-levels";
import {
  ACNE_CAUSES,
  SEE_DOCTOR_SIGNS,
  SKINCARE_BASICS,
} from "@/components/knowledge/content";

export const metadata = {
  title: "ความรู้ดูแลผิวแบบองค์รวม",
  description:
    "คำแนะนำดูแลผิวแบบองค์รวม การนอน ความเครียด อาหาร ชนิดของสิว สาเหตุ และเมื่อไรควรพบแพทย์",
};

const TOC = [
  { href: "#holistic", label: "ดูแลผิวแบบองค์รวม" },
  { href: "#skincare", label: "ดูแลผิวพื้นฐาน" },
  { href: "#causes", label: "สาเหตุของสิว" },
  { href: "#types", label: "สิว 6 ชนิด" },
  { href: "#severity", label: "ระดับความรุนแรง" },
  { href: "#doctor", label: "เมื่อไรควรพบแพทย์" },
];

function Heading({
  id,
  title,
  desc,
}: {
  id: string;
  title: string;
  desc?: string;
}) {
  return (
    <div id={id} className="flex scroll-mt-20 flex-col gap-2">
      <h2 className="text-2xl md:text-3xl">{title}</h2>
      {desc && <p className="text-muted-foreground">{desc}</p>}
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-12 md:py-16">
      <header className="flex flex-col gap-4">
        <span className="text-primary text-sm font-semibold">
          ความรู้ก่อนเริ่มวิเคราะห์
        </span>
        <h1 className="text-4xl font-extrabold md:text-5xl">
          ดูแลผิวแบบองค์รวม
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          สิวไม่ได้เกิดจากผิวอย่างเดียว การนอน ความเครียด และอาหารมีผลด้วย
          อ่านคำแนะนำพื้นฐานก่อน แล้วค่อยอัปโหลดรูปเพื่อให้ AI ช่วยประเมิน
        </p>
        <nav aria-label="สารบัญ" className="flex flex-wrap gap-2">
          {TOC.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="bg-card hover:bg-accent rounded-full border px-4 py-2 text-sm"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="flex flex-col gap-6">
        <Heading
          id="holistic"
          title="ดูแลผิวแบบองค์รวม"
          desc="พฤติกรรม 3 เรื่องที่ส่งผลต่อสิวโดยตรง"
        />
        <HolisticCare />
      </section>

      <section className="flex flex-col gap-6">
        <Heading id="skincare" title="ดูแลผิวพื้นฐาน" />
        <ul className="grid gap-3 md:grid-cols-2">
          {SKINCARE_BASICS.map((t) => (
            <li
              key={t}
              className="bg-card flex items-start gap-3 rounded-xl border p-4"
            >
              <CircleCheck
                className="text-primary mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-6">
        <Heading
          id="causes"
          title="สาเหตุของสิว"
          desc="สิวเริ่มที่รูขุมขน เมื่อหลายปัจจัยเกิดพร้อมกัน รูขุมขนจะอุดตันและอาจลุกลามเป็นการอักเสบ"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ACNE_CAUSES.map((c) => (
            <div
              key={c.title}
              className="bg-card flex flex-col gap-2 rounded-2xl border p-5"
            >
              <h3 className="text-lg">{c.title}</h3>
              <p className="text-muted-foreground text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <Heading id="types" title="สิว 6 ชนิด และวิธีดูแล" />
        <AcneTypeGrid detailed />
      </section>

      <section className="flex flex-col gap-6">
        <Heading id="severity" title="ระดับความรุนแรง และคำแนะนำของระบบ" />
        <SeverityLevels showAdvice />
      </section>

      <section className="flex flex-col gap-6">
        <Heading id="doctor" title="เมื่อไรควรพบแพทย์ผิวหนัง" />
        <div className="bg-card flex flex-col gap-4 rounded-2xl border p-6 md:flex-row md:items-start">
          <Stethoscope
            className="text-primary h-8 w-8 shrink-0"
            aria-hidden="true"
          />
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {SEE_DOCTOR_SIGNS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <MedicalDisclaimer className="text-sm" />
      </section>

      <div className="bg-primary text-primary-foreground flex flex-wrap items-center justify-between gap-4 rounded-3xl px-8 py-10">
        <p className="text-xl font-semibold">
          อ่านครบแล้ว พร้อมให้ AI ช่วยประเมินผิว
        </p>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="h-12 rounded-full px-7 text-base"
        >
          <Link href="/analyze">
            เริ่มวิเคราะห์ผิว <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
