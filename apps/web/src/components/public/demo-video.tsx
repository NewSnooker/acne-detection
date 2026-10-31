"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoVideo as DemoVideoSource } from "@/config/site";

// โหลดวิดีโอเมื่อเลื่อนมาใกล้ แล้วเล่นเองแบบปิดเสียงวนซ้ำ
// ถ้าเครื่องตั้งให้ลดภาพเคลื่อนไหว จะไม่เล่นเอง แต่ให้กดเล่นได้
export function DemoVideo({
  video,
  label,
}: {
  video: DemoVideoSource;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  // null = ยังไม่เลื่อนมาถึง
  const [playback, setPlayback] = useState<{ reducedMotion: boolean } | null>(
    null,
  );
  const visible = playback !== null;
  const reducedMotion = playback?.reducedMotion ?? false;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setPlayback({
            reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches,
          });
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!visible || !el) return;
    el.load();
    if (!reducedMotion) el.play().catch(() => undefined);
  }, [visible, reducedMotion]);

  return (
    <video
      ref={ref}
      aria-label={label}
      poster={video.poster}
      muted
      loop
      playsInline
      preload="none"
      controls={reducedMotion}
      className="bg-muted aspect-[16/10] w-full rounded-2xl object-cover"
    >
      {visible && video.webm && <source src={video.webm} type="video/webm" />}
      {visible && <source src={video.mp4} type="video/mp4" />}
    </video>
  );
}
