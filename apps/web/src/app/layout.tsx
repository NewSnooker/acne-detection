import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-thai",
});

export const metadata: Metadata = {
  title: {
    default: "AcneAI — วิเคราะห์สิวด้วย AI",
    template: "%s | AcneAI",
  },
  description:
    "ระบบวิเคราะห์และจำแนกสิว 6 ชนิดด้วย AI (YOLO) พร้อมให้คำแนะนำเบื้องต้น",
  keywords: ["สิว", "AI", "วิเคราะห์สิว", "acne detection", "YOLO"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ตัวแปรฟอนต์ต้องอยู่ที่ <html> เพราะ --font-sans ของ Tailwind อ่านค่าที่ :root
  return (
    <html
      lang="th"
      className={`${inter.variable} ${notoSansThai.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
