import { getServerSession } from "next-auth";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const fmtNum = (n) =>
  n == null ? "-" : Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });

/**
 * Generate PDF Purchase Order (Tahap 3). pdf-lib = pure JS, tidak butuh
 * dependency native/WASM — aman di host cPanel. Layout digambar manual pada
 * koordinat (pdf-lib low-level), cukup untuk dokumen PO satu halaman.
 */
export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PROCUREMENT") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { poId } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: true, materialRequest: { select: { docControlNo: true } } },
  });
  if (!po) return new Response("PO not found", { status: 404 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 potrait (pt)
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  const M = 48; // margin
  let y = 800;

  const text = (s, x, yy, size = 10, f = font, color = rgb(0, 0, 0)) =>
    page.drawText(String(s ?? ""), { x, y: yy, size, font: f, color });

  // Header
  text("PT ELSICOM", M, y, 16, bold);
  text("PURCHASE ORDER", width - M - bold.widthOfTextAtSize("PURCHASE ORDER", 16), y, 16, bold);
  y -= 18;
  text("Sistem E-Procurement", M, y, 9, font, rgb(0.4, 0.4, 0.4));
  y -= 24;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 22;

  // Meta dua kolom
  const col2 = 320;
  const metaLeft = [
    ["No. PO", po.poNumber],
    ["Tanggal PO", fmtDate(po.poDate)],
    ["Proyek", po.projectCode],
    ["Ref. MR", po.materialRequest?.docControlNo || "-"],
  ];
  const metaRight = [
    ["Supplier", po.supplierName],
    ["Term Pembayaran", po.termOfPayment || "-"],
    ["Target Kirim", fmtDate(po.deliveryTime)],
    ["Status", po.status],
  ];
  const startY = y;
  metaLeft.forEach(([k, v], i) => {
    const yy = startY - i * 16;
    text(k, M, yy, 9, bold);
    text(v, M + 90, yy, 9);
  });
  metaRight.forEach(([k, v], i) => {
    const yy = startY - i * 16;
    text(k, col2, yy, 9, bold);
    text(v, col2 + 90, yy, 9);
  });
  y = startY - metaLeft.length * 16 - 20;

  // Tabel item
  const cols = [
    { title: "No", x: M, w: 26, align: "left" },
    { title: "Deskripsi", x: M + 26, w: 200, align: "left" },
    { title: "Part No", x: M + 226, w: 90, align: "left" },
    { title: "Qty", x: M + 316, w: 50, align: "right" },
    { title: "Harga", x: M + 366, w: 65, align: "right" },
    { title: "Total", x: M + 431, w: 68, align: "right" },
  ];
  // Header baris
  page.drawRectangle({ x: M, y: y - 4, width: width - 2 * M, height: 18, color: rgb(0.93, 0.93, 0.93) });
  cols.forEach((c) => {
    const tx = c.align === "right" ? c.x + c.w - bold.widthOfTextAtSize(c.title, 9) : c.x + 2;
    text(c.title, tx, y, 9, bold);
  });
  y -= 20;

  const drawCell = (val, c, yy) => {
    const s = String(val ?? "");
    const size = 9;
    // potong deskripsi panjang agar tidak melebihi kolom
    let out = s;
    while (out.length > 3 && font.widthOfTextAtSize(out, size) > c.w - 4) out = out.slice(0, -1);
    if (out !== s) out = out.slice(0, -1) + "…";
    const tx = c.align === "right" ? c.x + c.w - font.widthOfTextAtSize(out, size) - 2 : c.x + 2;
    text(out, tx, yy, size);
  };

  po.items.forEach((it, i) => {
    if (y < 90) return; // satu halaman saja (cukup untuk PO umum)
    drawCell(i + 1, cols[0], y);
    drawCell(it.description, cols[1], y);
    drawCell(it.partNumber || "-", cols[2], y);
    drawCell(`${it.qty} ${it.unit}`, cols[3], y);
    drawCell(fmtNum(it.unitPrice), cols[4], y);
    drawCell(fmtNum(it.totalPrice), cols[5], y);
    y -= 16;
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: width - M, y: y + 4 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
  });

  y -= 8;
  const totalLabel = `TOTAL (${po.currency || "IDR"})`;
  text(totalLabel, cols[4].x, y, 10, bold);
  text(fmtNum(po.totalAmount), cols[5].x + cols[5].w - bold.widthOfTextAtSize(fmtNum(po.totalAmount), 10), y, 10, bold);

  if (po.notes) {
    y -= 28;
    text("Catatan:", M, y, 9, bold);
    y -= 14;
    text(po.notes.slice(0, 400), M, y, 9);
  }

  // Footer
  text(
    `Dicetak dari Sistem E-Procurement Elsicom · ${fmtDate(new Date())}`,
    M,
    40,
    8,
    font,
    rgb(0.5, 0.5, 0.5),
  );

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="PO-${po.poNumber.replace(/[^\w.-]/g, "_")}.pdf"`,
    },
  });
}
