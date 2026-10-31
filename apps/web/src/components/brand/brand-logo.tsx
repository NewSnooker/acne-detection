import Image from "next/image";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: 36, title: "text-sm", tagline: "text-xs" },
  md: { box: 40, title: "text-xl", tagline: "text-xs" },
  lg: { box: 64, title: "text-2xl", tagline: "text-sm" },
} as const;

export function BrandName({ className }: { className?: string }) {
  const { name, nameAccent } = siteConfig;
  const base = nameAccent
    ? name.slice(0, name.length - nameAccent.length)
    : name;
  return (
    <span className={className}>
      {base}
      {nameAccent && <span className="text-primary">{nameAccent}</span>}
    </span>
  );
}

// โลโก้ + ชื่อ + สโลแกน อ่านค่าจาก siteConfig ที่เดียว
export function BrandLogo({
  size = "md",
  showTagline = true,
  stacked = false,
  className,
}: {
  size?: keyof typeof SIZES;
  showTagline?: boolean;
  stacked?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      className={cn(
        "flex items-center gap-3",
        stacked && "flex-col gap-2 text-center",
        className,
      )}
    >
      <Image
        src={siteConfig.logo}
        alt=""
        width={s.box}
        height={s.box}
        className="shrink-0 rounded-xl"
        unoptimized
        priority
      />
      <span className="flex flex-col leading-tight">
        <BrandName className={cn("font-bold tracking-tight", s.title)} />
        {showTagline && (
          <span className={cn("text-muted-foreground", s.tagline)}>
            {siteConfig.tagline}
          </span>
        )}
      </span>
    </span>
  );
}
