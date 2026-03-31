import { NextRequest, NextResponse } from "next/server";
import { updateTip } from "@/lib/notion";
import { verifyAdminCookie } from "@/lib/adminAuth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminCookie(req);
  if (authError) return authError;

  const { id } = await params;
  const { text, enabled } = await req.json();

  try {
    await updateTip(id, text, enabled);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
