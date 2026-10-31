"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Apple, ArrowRight, Brain, Moon, Sparkles, X } from "lucide-react";
import { HOLISTIC_TIPS } from "./content";

const ICONS = { sleep: Moon, stress: Brain, food: Apple };
const SEEN_KEY = "acneai-holistic-promo-seen";

function hasSeenPromo() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markPromoSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // ปิด storage ไว้ — ครั้งหน้าจะเห็นป๊อปอัปอีก ไม่เป็นไร
  }
}

// คำแนะนำดูแลผิวแบบองค์รวมก่อนวิเคราะห์ (ข้อ 1.3.3.4)
// แสดงเป็นป๊อปอัปครั้งแรกครั้งเดียว ปิดด้วย ✕ แล้วเปิดดูอีกได้จากปุ่ม trigger
export function HolisticCarePromo({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasSeenPromo()) return;
    const timer = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) markPromoSeen();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content
          // ไม่โฟกัสปุ่ม ✕ ทันทีที่เปิด (ดูเหมือนถูกเลือกไว้) ให้โฟกัสที่กล่องแทน
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="bg-card data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl"
        >
          <div className="from-primary/15 via-primary/5 relative bg-gradient-to-br to-transparent px-6 pt-8 pb-5">
            <Dialog.Close
              className="text-muted-foreground hover:bg-background/70 hover:text-foreground focus-visible:ring-ring absolute top-3 right-3 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2"
              aria-label="ปิด"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
            <span className="bg-primary text-primary-foreground mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-primary text-sm font-semibold">
              ก่อนเริ่มวิเคราะห์
            </p>
            <Dialog.Title className="mt-1 text-2xl font-bold tracking-tight">
              ดูแลผิวแบบองค์รวม
            </Dialog.Title>
            <Dialog.Description className="text-muted-foreground mt-1 text-sm">
              3 เรื่องง่ายๆ ที่ช่วยให้ผิวดีขึ้นจากภายใน
            </Dialog.Description>
          </div>

          <ul className="flex flex-col gap-2 px-6 py-4">
            {HOLISTIC_TIPS.map((tip) => {
              const Icon = ICONS[tip.key];
              return (
                <li
                  key={tip.key}
                  className="bg-muted/50 flex items-center gap-3 rounded-2xl p-3"
                >
                  <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold">{tip.title}</p>
                    <p className="text-muted-foreground">{tip.short}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row">
            <Link
              href="/knowledge#holistic"
              onClick={() => handleOpenChange(false)}
              className="hover:bg-accent inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-full border text-sm font-medium transition-colors"
            >
              อ่านเพิ่มเติม <ArrowRight className="h-4 w-4" />
            </Link>
            <Dialog.Close className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 flex-1 cursor-pointer rounded-full text-sm font-semibold shadow-sm transition-colors">
              เริ่มวิเคราะห์เลย
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
