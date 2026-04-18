import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateMonthlyRecord } from "@/lib/notion";

async function auth() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_token")?.value === process.env.ADMIN_PASSWORD;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { pageId } = await params;
  const { date, newDate, clockIn, clockOut, break: breakVal, workStatus, note } = await req.json();
  if (!date) return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  try {
    await updateMonthlyRecord(pageId, date, { newDate, clockIn, clockOut, break: breakVal, workStatus, note });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
