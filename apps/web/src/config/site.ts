// ตั้งค่าแบรนด์ของเว็บไว้ที่เดียว — แก้ไฟล์นี้แล้วชื่อ สโลแกน โลโก้
// จะเปลี่ยนทั้งเว็บ (sidebar, หน้าเข้าสู่ระบบ, header/footer, title, favicon, รูปตอนแชร์ลิงก์)
export const siteConfig = {
  name: "AcneAI",
  // ส่วนท้ายของชื่อที่แสดงเป็นสีหลัก เช่น Acne + "AI" (ใส่ "" ถ้าไม่ต้องการ)
  nameAccent: "AI",
  tagline: "วิเคราะห์สิวด้วย AI",
  description:
    "ระบบวิเคราะห์และจำแนกสิว 6 ชนิดด้วย AI (YOLO) พร้อมให้คำแนะนำเบื้องต้น",
  keywords: ["สิว", "AI", "วิเคราะห์สิว", "acne detection", "YOLO"],
  // รูปเดียวใช้ทั้งโลโก้ในเว็บ favicon และรูปตอนแชร์ลิงก์ (วางไฟล์ไว้ใน public/)
  logo: "/brand/logo.svg",
  // ภาพหลักของหน้าแรก — ภาพวาดประกอบ (ไม่ใช่คนจริง) ภาพจัตุรัส
  hero: {
    src: "/landing/hero.webp",
    alt: "ตัวอย่างภาพใบหน้าพร้อมกรอบแยกชนิดสิว",
  },
  // วิดีโอเดโมใต้ภาพหลัก (วางไฟล์ไว้ใน public/landing/) — ใส่ null เพื่อซ่อนส่วนนี้
  // เช่น { mp4: "/landing/demo.mp4", webm: "/landing/demo.webm", poster: "/landing/demo-poster.jpg" }
  demoVideo: null as DemoVideo | null,
} as const;

export type DemoVideo = {
  mp4: string;
  webm?: string;
  poster: string;
};
