import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/providers/toaster";
import { siteConfig } from "@/config/site";
import { PALETTE_INIT_SCRIPT } from "@/lib/theme/palettes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-thai",
});

/**
 * ที่อยู่จริงของเว็บ ใช้ทำลิงก์เต็มของรูป Open Graph — ไม่ตั้ง = Next.js ใช้ localhost และเตือนใน log
 * อ่าน AUTH_URL ก่อน เพราะ NEXT_PUBLIC_* ถูกฝังค่าตอน build (image บน ghcr build โดยไม่มีค่านี้)
 */
function siteUrl(): URL | undefined {
  const value = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!value) return undefined;
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  icons: { icon: siteConfig.logo, apple: siteConfig.logo },
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [siteConfig.logo],
    locale: "th_TH",
    type: "website",
  },
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
      <head>
        {/* ใส่ธีมสีที่ผู้ใช้เลือกไว้ก่อนหน้าเว็บแสดง กันสีกะพริบ */}
        <script dangerouslySetInnerHTML={{ __html: PALETTE_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
