import { ACNE_LABELS } from "@/types/analyze";
import { cn } from "@/lib/utils";
import { ACNE_GROUPS, ACNE_TYPE_INFO } from "./content";
import { ACNE_SAMPLES } from "./acne-samples";
import { SampleImage } from "./sample-image";

// การ์ดสิว 6 ชนิด แบ่งตามกลุ่มการอักเสบ — detailed = แสดงวิธีดูแลด้วย (หน้าความรู้)
export function AcneTypeGrid({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {ACNE_GROUPS.flatMap((group) =>
        group.types.map((type) => {
          const info = ACNE_TYPE_INFO[type];
          const sample = ACNE_SAMPLES[type];
          return (
            <article
              key={type}
              className="bg-card overflow-hidden rounded-2xl border shadow-sm"
            >
              <SampleImage
                src={sample.src}
                alt={`ตัวอย่างภาพ${ACNE_LABELS[type]}`}
              />
              <div className="flex flex-col gap-2 p-5">
                <span
                  className={cn(
                    "self-start rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    group.badge,
                  )}
                >
                  {group.label}
                </span>
                <h3 className="text-lg">
                  {ACNE_LABELS[type]}{" "}
                  <span className="text-muted-foreground text-sm font-normal">
                    {info.en}
                  </span>
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {info.desc}
                </p>
                {detailed && (
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">การดูแล: </span>
                    {info.care}
                  </p>
                )}
              </div>
            </article>
          );
        }),
      )}
    </div>
  );
}
