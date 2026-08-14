"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { notify } from "./notification";

/**
 * Finance (Tahap 4, Perancangan Terpadu 6.5). Terpisah dari Document Control.
 * Cakupan: pembayaran invoice PO — daftar invoice belum lunas, tandai lunas.
 */

async function requireFinance() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FINANCE") {
    throw new Error("Unauthorized: hanya Finance yang boleh mengakses ini.");
  }
  return session;
}

export async function getInvoices(paid = false) {
  try {
    await requireFinance();
    const invoices = await prisma.pOInvoice.findMany({
      where: { isPaid: paid },
      include: {
        po: { select: { poNumber: true, supplierName: true, projectCode: true, createdBy: true } },
      },
      orderBy: paid ? { paidAt: "desc" } : { createdAt: "asc" },
      ...(paid ? { take: 50 } : {}),
    });
    return { success: true, data: invoices };
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function markInvoicePaid(invoiceId) {
  try {
    await requireFinance();
    const inv = await prisma.pOInvoice.findUnique({
      where: { id: invoiceId },
      include: { po: { select: { poNumber: true, createdBy: true } } },
    });
    if (!inv) throw new Error("Invoice tidak ditemukan.");
    if (inv.isPaid) throw new Error("Invoice sudah lunas.");

    const updated = await prisma.pOInvoice.update({
      where: { id: invoiceId },
      data: { isPaid: true, paidAt: new Date() },
    });

    // Beri tahu pembuat PO bahwa invoice sudah dibayar.
    await notify(
      inv.po.createdBy,
      `Invoice ${inv.invoiceNo} untuk PO ${inv.po.poNumber} sudah dibayar Finance.`,
      "/procurement/po-list",
    );

    revalidatePath("/finance");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error marking invoice paid:", error);
    return { success: false, error: error.message };
  }
}
