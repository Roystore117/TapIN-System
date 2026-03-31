import { NextRequest, NextResponse } from "next/server";
import { getTodayPunches } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const employeeId = req.nextUrl.searchParams.get("employeeId");
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }
  try {
    const punches = await getTodayPunches(employeeId);
    return NextResponse.json(punches);
  } catch (e: any) {
    const detail = e?.body ?? e?.message ?? String(e);
    return NextResponse.json({ error: "取得に失敗しました", detail }, { status: 500 });
  }
}
