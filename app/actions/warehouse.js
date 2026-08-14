"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

/**
 * Aksi modul /warehouse (role WAREHOUSE).
 *
 * Goods Receipt sendiri memakai ulang markItemReceived()/updatePOItem() yang
 * sudah ada di purchase-order.js (permission-check-nya sudah mengizinkan role
 * WAREHOUSE) — di sini hanya query daftar yang perlu ditindak.
 */

async function requireWarehouse() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "WAREHOUSE") {
    throw new Error("Unauthorized: hanya WAREHOUSE yang boleh mengakses ini.");
  }
  return session;
}

/**
 * PO yang perlu Goods Receipt: sudah dikirim ke supplier (RELEASED) atau
 * sebagian sudah diterima (PARTIAL_RECEIVED). FULL_RECEIVED sudah selesai.
 */
export async function getGoodsReceiptPOs() {
  try {
    await requireWarehouse();
    const pos = await prisma.purchaseOrder.findMany({
      where: { status: { in: ["RELEASED", "PARTIAL_RECEIVED"] } },
      include: { items: true, creator: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: pos };
  } catch (error) {
    console.error("Error fetching goods-receipt POs:", error);
    return { success: false, error: error.message };
  }
}

/**
 * WR yang menunggu approval sisi Warehouse: belum ada persetujuan Warehouse dan
 * belum final. (PROCUREMENT_APPROVED tetap masuk karena Warehouse-nya belum.)
 */
export async function getWRForWarehouseApproval() {
  try {
    await requireWarehouse();
    const releases = await prisma.warehouseRelease.findMany({
      where: {
        status: { in: ["PENDING_APPROVAL", "PROCUREMENT_APPROVED"] },
        warehouseApprovedBy: null,
      },
      include: { items: true, requester: true, materialRequest: true, procurementApprover: true },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: releases };
  } catch (error) {
    console.error("Error fetching WR for warehouse approval:", error);
    return { success: false, error: error.message };
  }
}
