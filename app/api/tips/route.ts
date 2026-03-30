import { NextResponse } from "next/server";
import { getAllTips } from "@/lib/notion";

export async function GET() {
  try {
    const tips = await getAllTips();
    return NextResponse.json(tips);
  } catch (err: any) {
    return NextResponse.json({ error: "一言データの取得に失敗しました" }, { status: 500 });
  }
}
