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

export const metadata: Metadata = {
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
