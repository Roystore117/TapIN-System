import { NextRequest, NextResponse } from "next/server";

export function verifyAdminCookie(req: NextRequest): NextResponse | null {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 403 });
  }
  return null; // OK
}
