import Link from "next/link";
import { Apple, ArrowRight, Brain, Moon } from "lucide-react";
import { HOLISTIC_TIPS } from "./content";

const ICONS = { sleep: Moon, stress: Brain, food: Apple };

// คำแนะนำดูแลผิวแบบองค์รวม (ข้อ 1.3.3.4)
// compact = การ์ดสั้นในหน้าวิเคราะห์ ก่อนอัปโหลดภาพ
export function HolisticCare({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <section
        aria-labelledby="holistic-title"
        className="border-primary/25 bg-primary/5 rounded-xl border p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="holistic-title" className="text-base">
            ก่อนเริ่มวิเคราะห์: ดูแลผิวแบบองค์รวม
          </h2>
          <Link
            href="/knowledge#holistic"
            className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            อ่านเพิ่มเติม <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {HOLISTIC_TIPS.map((tip) => {
            const Icon = ICONS[tip.key];
            return (
              <li
                key={tip.key}
                className="bg-card flex items-start gap-3 rounded-lg border p-3"
              >
                <Icon
                  className="text-primary mt-0.5 h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
                <div className="text-sm">
                  <p className="font-semibold">{tip.title}</p>
                  <p className="text-foreground/75">{tip.short}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {HOLISTIC_TIPS.map((tip) => {
        const Icon = ICONS[tip.key];
        return (
          <article
            key={tip.key}
            className="bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-sm"
          >
            <span className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="text-xl">{tip.title}</h3>
            <ul className="text-muted-foreground flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
              {tip.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
