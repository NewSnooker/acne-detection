import { Apple, Brain, Moon } from "lucide-react";
import { HOLISTIC_TIPS } from "./content";

const ICONS = { sleep: Moon, stress: Brain, food: Apple };

// คำแนะนำดูแลผิวแบบองค์รวม (ข้อ 1.3.3.4)
// หน้าวิเคราะห์ใช้แบบป๊อปอัป (holistic-care-promo.tsx)
export function HolisticCare() {
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
