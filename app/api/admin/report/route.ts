import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, type PDFPage, type PDFFont } from "pdf-lib";

import { requireAdminApiUser } from "@/lib/auth";
import { deleteProjectsByYear, getAdminStatistics } from "@/lib/projects";
import type { AdminStatistics } from "@/lib/types";

export const runtime = "nodejs";

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: { size: number; font: PDFFont; color?: string | number[]; maxWidth?: number },
) {
  page.drawText(text, {
    x,
    y,
    size: options.size,
    font: options.font,
    color: options.color,
    maxWidth: options.maxWidth,
    lineHeight: options.size * 1.25,
  });
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
  drawText(page, `Total sales: ${Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(stats.totalSales / 100)}`,
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
      Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
      }).format(monthStat.amount / 100),
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
  const year = yearParam ? Number(yearParam) : new Date().getUTCFullYear();

  if (!Number.isInteger(year) || year < 2000) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
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

  const pdfDoc = await createReportPdf(stats);
  const pdfBytes = await pdfDoc.save();

  try {
    await deleteProjectsByYear(year);
  } catch {
    // If cleanup fails, we still return the report.
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="graphiq-studiox-report-${year}.pdf"`,
    },
  });
}
