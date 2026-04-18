import { NextRequest, NextResponse } from "next/server";
import { updateEmployee } from "@/lib/notion";
import { verifyAdminCookie } from "@/lib/adminAuth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminCookie(req);
  if (authError) return authError;

  const { id } = await params;
  const fields = await req.json();
  try {
    await updateEmployee(id, fields);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
