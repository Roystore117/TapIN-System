import { NextRequest, NextResponse } from "next/server";
import { getPayrollSettings, updatePayrollSettings } from "@/lib/notion";
import { verifyAdminCookie } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const authError = verifyAdminCookie(req);
  if (authError) return authError;

  try {
    const settings = await getPayrollSettings();
    return NextResponse.json(settings);
  } catch (e: any) {
    const detail = e?.body ?? e?.message ?? String(e);
    return NextResponse.json({ error: "取得に失敗しました", detail }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authError = verifyAdminCookie(req);
  if (authError) return authError;

  try {
    const { id, startTime, endTime, deemedOvertimeHours, alertThreshold, autoSwitch, switchTime } = await req.json();
    await updatePayrollSettings(id, { startTime, endTime, deemedOvertimeHours, alertThreshold, autoSwitch, switchTime });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
