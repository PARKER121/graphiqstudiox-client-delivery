import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiUser } from "@/lib/auth";
import { deleteProjectsByYear, getAdminStatistics } from "@/lib/projects";
import type { AdminStatistics } from "@/lib/types";

export const runtime = "nodejs";

function createReportCsv(stats: AdminStatistics): string {
  const lines: string[] = [];
  
  // Header
  lines.push("Graphiq Studiox Yearly Report");
  lines.push("");
  lines.push(`Year,${stats.year}`);
  lines.push(`Total Sales (GHS),${(stats.totalSales / 100).toFixed(2)}`);
  lines.push(`Total Clients,${stats.totalClients}`);
  lines.push(`Clients This Month,${stats.clientsThisMonth}`);
  lines.push("");
  
  // Monthly breakdown
  lines.push("Monthly Breakdown");
  lines.push("Month,Sales (GHS),Clients");
  
  for (const monthStat of stats.monthlyStats) {
    const sales = (monthStat.amount / 100).toFixed(2);
    lines.push(`${monthStat.month},${sales},${monthStat.clients}`);
  }
  
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  await requireAdminApiUser(request);

  const yearParam = request.nextUrl.searchParams.get("year");
  const format = (request.nextUrl.searchParams.get("format") || "pdf").toLowerCase();
  const year = yearParam ? Number(yearParam) : new Date().getUTCFullYear();

  if (!Number.isInteger(year) || year < 2000) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  if (!["pdf", "csv"].includes(format)) {
    return NextResponse.json(
      { error: "Invalid format. Use 'pdf' or 'csv'." },
      { status: 400 },
    );
  }

  let stats: AdminStatistics;

  try {
    stats = await getAdminStatistics(year);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to build report." },
      { status: 500 },
    );
  }

  try {
    await deleteProjectsByYear(year);
  } catch {
    // If cleanup fails, we still return the report.
  }

  // Only CSV format is supported (PDF generation removed for memory optimization)
  if (format !== "csv") {
    return NextResponse.json(
      {
        error: "Only CSV format is supported for this endpoint. Use format=csv",
        note: "PDF generation has been removed to optimize memory usage for Vercel Hobby plan",
      },
      { status: 400 },
    );
  }

  const csvContent = createReportCsv(stats);
  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="graphiq-studiox-report-${year}.csv"`,
    },
  });
}
