import { NextRequest, NextResponse } from "next/server";
import { getAllEmployeesAdmin, createEmployee } from "@/lib/notion";
import { verifyAdminCookie } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const authError = verifyAdminCookie(req);
  if (authError) return authError;

  try {
    const employees = await getAllEmployeesAdmin();
    return NextResponse.json(employees);
  } catch {
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = verifyAdminCookie(req);
  if (authError) return authError;

  const { name, employeeId, status } = await req.json();
  try {
    const employee = await createEmployee(name, employeeId, status);
    return NextResponse.json(employee);
  } catch (e: any) {
    const detail = e?.body ?? e?.message ?? String(e);
    return NextResponse.json({ error: "追加に失敗しました", detail }, { status: 500 });
  }
}
