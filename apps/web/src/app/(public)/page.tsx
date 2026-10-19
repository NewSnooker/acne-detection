import Link from "next/link"
import { auth } from "@/lib/auth"
import { ArrowRight, ScanFace, Activity, ShieldCheck, Cpu } from "lucide-react"

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <ScanFace className="h-6 w-6 text-primary" />
          Acne<span className="text-primary">AI</span>
        </div>
        <nav className="flex items-center gap-4">
          {session ? (
            <Link href="/analyze" className="text-sm font-medium hover:text-primary transition-colors">
              แดชบอร์ด
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              เข้าสู่ระบบ
            </Link>
          )}
          <Link 
            href="/analyze" 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            เริ่มวิเคราะห์สิว
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="w-full py-20 md:py-32 lg:py-40 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
          
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl -z-10 opacity-70"></div>
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            ขับเคลื่อนด้วย YOLO AI (Local Inference)
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
            วิเคราะห์ปัญหาผิวหน้าด้วย <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">AI อัจฉริยะ</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            ระบบอัปโหลดรูปภาพเพื่อตรวจจับสิวอุดตัน, สิวอักเสบ, และสิวหนอง ด้วยความแม่นยำสูง รู้ผลลัพธ์ในไม่กี่วินาที พร้อมประวัติการวิเคราะห์
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-300">
            <Link 
              href="/analyze" 
              className="h-14 px-8 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full text-base font-semibold hover:bg-primary/90 transition-all hover:gap-3 hover:shadow-lg hover:shadow-primary/25 group"
            >
              เริ่มวิเคราะห์รูปภาพ
              <ArrowRight className="h-5 w-5 transition-all group-hover:translate-x-1" />
            </Link>
            {!session && (
              <Link 
                href="/login" 
                className="h-14 px-8 inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground rounded-full text-base font-semibold hover:bg-secondary/80 transition-all"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-20 bg-muted/30 border-t">
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background border p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <ScanFace className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">แม่นยำด้วย Computer Vision</h3>
              <p className="text-muted-foreground leading-relaxed">
                ใช้โมเดล YOLO (You Only Look Once) ที่ฝึกสอนมาเพื่อแยกแยะประเภทสิวได้อย่างแม่นยำและรวดเร็ว
              </p>
            </div>
            
            <div className="bg-background border p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">ทำงานรวดเร็วแบบ Local</h3>
              <p className="text-muted-foreground leading-relaxed">
                ประมวลผลบนเครื่องเซิร์ฟเวอร์แบบ Local Backend (FastAPI) ส่งผลลัพธ์กลับมาได้อย่างรวดเร็ว ไม่ต้องพึ่งพา Cloud ภายนอก
              </p>
            </div>

            <div className="bg-background border p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">เก็บสถิติและประวัติ</h3>
              <p className="text-muted-foreground leading-relaxed">
                ระบบจะบันทึกประวัติการวิเคราะห์ทั้งหมดของคุณไว้ในฐานข้อมูล เพื่อให้คุณสามารถติดตามผลการรักษาได้อย่างต่อเนื่อง
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t bg-background">
        <p>© {new Date().getFullYear()} Acne AI System. Developed as an internal tool.</p>
      </footer>
    </div>
  )
}
