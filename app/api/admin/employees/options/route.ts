import { NextRequest, NextResponse } from "next/server";
import { getEmployeeDBOptions } from "@/lib/notion";
import { verifyAdminCookie } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const authError = verifyAdminCookie(req);
  if (authError) return authError;

  try {
    const options = await getEmployeeDBOptions();
    return NextResponse.json(options);
  } catch {
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
