import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiUser } from "@/lib/auth";
import { getAdminStatistics } from "@/lib/projects";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApiUser(request);
    const yearParam = request.nextUrl.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear();
    const stats = await getAdminStatistics(year);
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to fetch statistics.",
      },
      { status: 500 },
    );
  }
}
