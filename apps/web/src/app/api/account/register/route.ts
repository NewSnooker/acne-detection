import { NextRequest, NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/http-error";
import { registerUserLogic } from "@/lib/services/auth-logic";

export async function POST(req: NextRequest) {
  try {
    await registerUserLogic(await readJson(req));
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return errorResponse(
      error,
      "สมัครสมาชิกไม่สำเร็จ",
      "POST /api/account/register",
    );
  }
}
