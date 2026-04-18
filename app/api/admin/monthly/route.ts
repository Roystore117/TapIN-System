import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMonthlyRecords } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_token")?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const employeeId = searchParams.get("employeeId");
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const month = parseInt(searchParams.get("month") ?? "", 10);

  if (!employeeId || isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  try {
    const records = await getMonthlyRecords(employeeId, year, month);
    return NextResponse.json(records);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
