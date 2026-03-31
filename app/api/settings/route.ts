import { NextResponse } from "next/server";
import { getPayrollSettings } from "@/lib/notion";

// 打刻画面から認証なしで読む公開エンドポイント
export async function GET() {
  try {
    const settings = await getPayrollSettings();
    return NextResponse.json({
      autoSwitch: settings.autoSwitch,
      switchTime: settings.switchTime,
    });
  } catch {
    return NextResponse.json({ autoSwitch: true, switchTime: "12:00" });
  }
}
