import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

import { requireAdminApiUser } from "@/lib/auth";
import { deleteProjectsByYear, getAdminStatistics } from "@/lib/projects";
import type { AdminStatistics } from "@/lib/types";

export const runtime = "nodejs";

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: { size: number; font: PDFFont; color?: [number, number, number]; maxWidth?: number },
) {
  const drawOptions: Parameters<PDFPage["drawText"]>[1] = {
    x,
    y,
    size: options.size,
    font: options.font,
    maxWidth: options.maxWidth,
    lineHeight: options.size * 1.25,
  };
  
  if (options.color) {
    drawOptions.color = rgb(options.color[0] / 255, options.color[1] / 255, options.color[2] / 255);
  }
  
  page.drawText(text, drawOptions);
}

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

async function createReportPdf(stats: AdminStatistics) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  let y = page.getHeight() - margin;

  drawText(page, "Graphiq Studiox Yearly Report", margin, y, {
    size: 20,
    font: helveticaBold,
  });

  y -= 30;
  drawText(page, `Year: ${stats.year}`, margin, y, {
    size: 12,
    font: helvetica,
  });

  y -= 25;
  drawText(
    page,
    `Total sales: GHS ${(stats.totalSales / 100).toFixed(2)}`,
    margin,
    y,
    {
      size: 12,
      font: helvetica,
    },
  );

  y -= 18;
  drawText(page, `Clients paid this year: ${stats.totalClients}`, margin, y, {
    size: 12,
    font: helvetica,
  });

  y -= 18;
  drawText(page, `Clients this month: ${stats.clientsThisMonth}`, margin, y, {
    size: 12,
    font: helvetica,
  });

  y -= 28;
  drawText(page, "Monthly breakdown:", margin, y, {
    size: 14,
    font: helveticaBold,
  });

  y -= 24;
  const rowHeight = 18;
  const headerX = margin;
  const salesX = 220;
  const clientsX = 380;

  drawText(page, "Month", headerX, y, { size: 12, font: helveticaBold });
  drawText(page, "Sales", salesX, y, { size: 12, font: helveticaBold });
  drawText(page, "Clients", clientsX, y, { size: 12, font: helveticaBold });

  y -= rowHeight;

  for (const monthStat of stats.monthlyStats) {
    if (y < margin + rowHeight) {
      page = pdfDoc.addPage([595, 842]);
      y = page.getHeight() - margin;
    }

    drawText(page, monthStat.month, headerX, y, { size: 12, font: helvetica });
    drawText(
      page,
      `GHS ${(monthStat.amount / 100).toFixed(2)}`,
      salesX,
      y,
      { size: 12, font: helvetica },
    );
    drawText(page, String(monthStat.clients), clientsX, y, {
      size: 12,
      font: helvetica,
    });
    y -= rowHeight;
  }

  return pdfDoc;
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

  if (format === "csv") {
    const csvContent = createReportCsv(stats);
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="graphiq-studiox-report-${year}.csv"`,
      },
    });
  }

  // Default to PDF
  const pdfDoc = await createReportPdf(stats);
  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="graphiq-studiox-report-${year}.pdf"`,
    },
  });
}
