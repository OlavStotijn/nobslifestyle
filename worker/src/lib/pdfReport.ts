import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface PdfReportSection {
  title: string;
  rows: string[][]; // each row's cells, joined with consistent spacing
}

// A simple, text-based printable summary — not a pixel copy of the in-app
// charts (drawing chart graphics by hand in pdf-lib is a lot more work for
// little benefit over just giving someone a clean, readable table they can
// print or forward to a coach).
export async function buildSummaryPdf(title: string, generatedAt: string, sections: PdfReportSection[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595; // A4 at 72dpi
  const pageHeight = 842;
  const margin = 50;
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function newPageIfNeeded(neededSpace: number) {
    if (y - neededSpace < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  page.drawText(title, { x: margin, y, size: 20, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
  y -= 24;
  page.drawText(`Generated ${generatedAt}`, { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 30;

  for (const section of sections) {
    newPageIfNeeded(40);
    page.drawText(section.title, { x: margin, y, size: 14, font: boldFont, color: rgb(0.15, 0.4, 0.1) });
    y -= 20;

    if (section.rows.length === 0) {
      page.drawText("No data yet.", { x: margin, y, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
      y -= 20;
      continue;
    }

    for (const row of section.rows) {
      newPageIfNeeded(16);
      page.drawText(row.join("   "), { x: margin, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
    y -= 14;
  }

  return doc.save();
}
