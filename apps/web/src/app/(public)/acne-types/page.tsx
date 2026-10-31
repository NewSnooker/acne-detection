import { AcneTypeGrid } from "@/components/knowledge/acne-type-grid";
import { PageIntro, StartCta } from "@/components/public/page-intro";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "ชนิดของสิว",
  description:
    "สิว 6 ชนิดที่ระบบตรวจจับได้ แบ่งตามความลึกของการอักเสบ พร้อมภาพตัวอย่างและวิธีดูแล",
};

export default function AcneTypesPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 md:py-16">
      <PageIntro
        eyebrow="ความรู้เรื่องสิว"
        title={`สิว 6 ชนิดที่ ${siteConfig.name} ตรวจจับได้`}
        desc="แบ่งเป็น 3 กลุ่มตามความลึกของการอักเสบ ซึ่งเป็นเกณฑ์ที่ระบบใช้ประเมินความรุนแรง ภาพทั้งหมดเป็นภาพจริงพร้อมกรอบสีแบบเดียวกับผลวิเคราะห์"
      />
      <AcneTypeGrid detailed />
      <StartCta desc="อัปโหลดรูปแล้วระบบจะบอกว่าพบสิวชนิดไหน กี่จุด" />
    </div>
  );
}
