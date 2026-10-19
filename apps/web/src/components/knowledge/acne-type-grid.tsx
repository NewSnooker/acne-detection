import { ACNE_COLORS, ACNE_LABELS } from "@/types/analyze";
import { ACNE_GROUPS, ACNE_TYPE_INFO } from "./content";
import { ACNE_SAMPLES } from "./acne-samples";
import { SampleImage } from "./sample-image";

// สิว 6 ชนิด แบ่งตามกลุ่มการอักเสบ — detailed = แสดงวิธีดูแลด้วย (หน้าความรู้)
export function AcneTypeGrid({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {ACNE_GROUPS.flatMap((group) =>
        group.types.map((type) => {
          const info = ACNE_TYPE_INFO[type];
          const sample = ACNE_SAMPLES[type];
          return (
            <article key={type} className="flex flex-col gap-4">
              {/* กรอบภาพแบบเดียวกันทุกใบ ให้ภาพจากหลายแหล่งดูเป็นชุดเดียวกัน */}
              <div className="rounded-[1.75rem] border bg-card p-2">
                <SampleImage
                  src={sample.src}
                  boxes={sample.boxes}
                  alt={`ตัวอย่างภาพ${ACNE_LABELS[type]}`}
                  className="rounded-[1.25rem]"
                />
              </div>
              <div className="flex flex-col gap-1 px-1">
                <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full ring-1 ring-black/10" style={{ backgroundColor: ACNE_COLORS[type] }} />
                  {group.label}
                </p>
                <h3 className="text-lg">
                  {ACNE_LABELS[type]} <span className="font-normal text-muted-foreground">{info.en}</span>
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{info.desc}</p>
                {detailed && (
                  <p className="mt-1 text-sm leading-relaxed">
                    <span className="font-medium">การดูแล: </span>
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
