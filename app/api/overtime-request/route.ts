import { NextRequest, NextResponse } from "next/server";
import { createOvertimeRequest } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    await createOvertimeRequest(data);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const detail = e?.body ?? e?.message ?? String(e);
    console.error("時間外申請エラー:", detail);
    return NextResponse.json({ error: "申請に失敗しました", detail }, { status: 500 });
  }
}
