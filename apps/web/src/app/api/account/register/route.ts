import { NextRequest, NextResponse } from "next/server";
import { registerUserLogic } from "@/lib/services/auth-logic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await registerUserLogic(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API /api/auth/register Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก" },
      { status: 400 },
    );
  }
}
