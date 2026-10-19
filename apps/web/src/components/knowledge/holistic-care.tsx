import Link from "next/link";
import { Apple, ArrowRight, Brain, Moon } from "lucide-react";
import { HOLISTIC_TIPS } from "./content";

const ICONS = { sleep: Moon, stress: Brain, food: Apple };

// คำแนะนำดูแลผิวแบบองค์รวม (ข้อ 1.3.3.4)
// compact = การ์ดสั้นในหน้าวิเคราะห์ ก่อนอัปโหลดภาพ
export function HolisticCare({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <section aria-labelledby="holistic-title" className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="holistic-title" className="text-base">
            ก่อนเริ่มวิเคราะห์: ดูแลผิวแบบองค์รวม
          </h2>
          <Link href="/knowledge#holistic" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            อ่านเพิ่มเติม <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {HOLISTIC_TIPS.map((tip) => {
            const Icon = ICONS[tip.key];
            return (
              <li key={tip.key} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-semibold">{tip.title}</p>
                  <p className="text-muted-foreground">{tip.short}</p>
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
          <article key={tip.key} className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="text-xl">{tip.title}</h3>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
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
