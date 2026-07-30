import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/providers/theme-provider"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "AcneAI — วิเคราะห์สิวด้วย AI",
    template: "%s | AcneAI",
  },
  description: "ระบบวิเคราะห์และจำแนกสิว 6 ชนิดด้วย AI (YOLO) พร้อมให้คำแนะนำเบื้องต้น",
  keywords: ["สิว", "AI", "วิเคราะห์สิว", "acne detection", "YOLO"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
