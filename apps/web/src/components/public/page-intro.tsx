import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// หัวหน้าของหน้าสาธารณะ (ชนิดของสิว, ความแม่นยำ, ความรู้ดูแลผิว)
export function PageIntro({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4">
      <span className="text-primary text-sm font-semibold">{eyebrow}</span>
      <h1 className="text-4xl font-extrabold md:text-5xl">{title}</h1>
      <p className="text-muted-foreground max-w-2xl text-lg">{desc}</p>
      {children}
    </header>
  );
}

// แถบชวนเริ่มวิเคราะห์ท้ายหน้า
export function StartCta({
  title = "พร้อมให้ AI ช่วยประเมินผิว",
  desc,
}: {
  title?: string;
  desc?: string;
}) {
  return (
    <div className="bg-primary text-primary-foreground flex flex-wrap items-center justify-between gap-6 rounded-3xl px-8 py-10 md:px-12">
      <div className="flex max-w-xl flex-col gap-2">
        <h2 className="text-2xl md:text-3xl">{title}</h2>
        {desc && <p className="text-primary-foreground/80">{desc}</p>}
      </div>
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
  );
}
