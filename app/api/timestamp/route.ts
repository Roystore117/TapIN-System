import { NextRequest, NextResponse } from "next/server";
import { registerClockIn, registerClockOut, StampType } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageId, employeeName, type, mockTime } = body as {
      pageId: string;
      employeeName: string;
      type: StampType;
      mockTime?: string;
    };

    if (!pageId || !employeeName || !type) {
      return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
    }
    if (type !== "出勤" && type !== "退勤") {
      return NextResponse.json({ error: "不正な打刻種別" }, { status: 400 });
    }

    if (type === "出勤") {
      await registerClockIn(pageId, employeeName, mockTime);
    } else {
      await registerClockOut(pageId, mockTime);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === "ALREADY_CLOCKED_IN") {
      return NextResponse.json({ error: "出勤中です！" }, { status: 409 });
    }
    if (error?.message === "ALREADY_CLOCKED_OUT") {
      return NextResponse.json({ error: "本日はすでに退勤済みです。出勤の打刻が見つからない場合はオーナーに連絡してください" }, { status: 409 });
    }
    const detail = error?.body ?? error?.message ?? String(error);
    console.error("打刻登録エラー:", detail);
    return NextResponse.json(
      { error: "打刻の登録に失敗しました", detail },
      { status: 500 }
    );
  }
}
