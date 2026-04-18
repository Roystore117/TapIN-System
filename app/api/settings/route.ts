import { NextResponse } from "next/server";

// 打刻画面から認証なしで読む公開エンドポイント
// autoSwitch/switchTime カラムはNotionDBから削除済みのためデフォルト値を返す
export async function GET() {
  return NextResponse.json({ autoSwitch: true, switchTime: "12:00" });
}
