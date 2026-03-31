import { NextRequest, NextResponse } from "next/server";
import { registerTimestamp, getPayrollSettings, StampType } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageId, employeeName, type, mockTime } = body as {
      pageId: string;
      employeeName: string;
      type: StampType;
      mockTime?: string; // "HH:MM" 形式（デバッグ用）
    };

    if (!pageId || !employeeName || !type) {
      return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
    }
    if (type !== "出勤" && type !== "退勤") {
      return NextResponse.json({ error: "不正な打刻種別" }, { status: 400 });
    }

    const settings = await getPayrollSettings();
    await registerTimestamp(pageId, employeeName, type, mockTime, settings.startTime, settings.endTime);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const detail = error?.body ?? error?.message ?? String(error);
    console.error("打刻登録エラー:", detail);
    return NextResponse.json(
      { error: "打刻の登録に失敗しました", detail },
      { status: 500 }
    );
  }
}
