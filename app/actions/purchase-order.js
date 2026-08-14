"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { notify } from "./notification";

// ─── Helper: Calculate PO Health ──────────────────────────────────────────────

/**
 * Calculate PO health based on delivery date vs today
 * Returns: ON_TRACK | WARNING | CRITICAL | LATE | RECEIVED
 */
function calculatePOHealth(po) {
  // If all items received with matIn dates, mark as RECEIVED
  if (po.items && po.items.every(item => item.matIn)) {
    return "RECEIVED";
  }

  const today = new Date();
  const daysUntilDelivery = Math.ceil((po.deliveryTime - today) / (1000 * 60 * 60 * 24));

  if (daysUntilDelivery > 14) return "ON_TRACK";
  if (daysUntilDelivery > 7) return "WARNING";
  if (daysUntilDelivery >= 0) return "CRITICAL";
  return "LATE";
}

// ─── Generate PO Number ───────────────────────────────────────────────────────

/**
 * Generate next PO number for a project code
 * Format: 001/2499/Elsicom per project
 */
export async function generatePONumber(projectCode) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can generate PO numbers.");
    }

    // Find the highest sequence number for this project code
    const lastPO = await prisma.purchaseOrder.findMany({
      where: { projectCode },
      orderBy: { poNumber: "desc" },
      take: 1,
    });

    let nextSequence = 1;
    if (lastPO.length > 0) {
      // Extract sequence from poNumber (e.g., "001/2499/Elsicom" → "001")
      const match = lastPO[0].poNumber.match(/^(\d+)\//);
      if (match) {
        nextSequence = parseInt(match[1]) + 1;
      }
    }

    const paddedSequence = String(nextSequence).padStart(3, "0");
    const poNumber = `${paddedSequence}/${projectCode}/Elsicom`;

    return { success: true, data: { poNumber } };
  } catch (error) {
    console.error("Error generating PO number:", error);
    return { success: false, error: error.message };
  }
}

// ─── Create Purchase Order ────────────────────────────────────────────────────

/**
 * Create a new Purchase Order
 * Can be from Material Request or manual entry
 */
export async function createPurchaseOrder(data) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can create POs.");
    }

    const {
      poNumber,
      projectId,
      projectCode,
      supplierName,
      termOfPayment,
      deliveryTime,
      totalAmount,
      currency = "IDR",
      materialRequestId,
      items = [],
    } = data;

    // Create PO with items
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        projectId,
        projectCode,
        supplierName,
        termOfPayment,
        deliveryTime: new Date(deliveryTime),
        totalAmount: totalAmount ? parseFloat(totalAmount) : null,
        currency,
        materialRequestId,
        createdBy: session.user.id.toString(),
        status: "RELEASED",
        items: {
          create: items.map(item => ({
            description: item.description,
            partNumber: item.partNumber,
            qty: parseInt(item.qty),
            unit: item.unit,
            unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null,
            totalPrice: item.totalPrice ? parseFloat(item.totalPrice) : null,
            prNo: item.prNo,
            prDate: item.prDate ? new Date(item.prDate) : null,
            prProcessDate: item.prProcessDate ? new Date(item.prProcessDate) : null,
            mrItemId: item.mrItemId,
          })),
        },
      },
      include: { items: true, creator: true },
    });

    // If from MR, update MR status to PROCUREMENT_PROCESS + beri tahu Requestor.
    if (materialRequestId) {
      const mr = await prisma.materialRequest.update({
        where: { id: materialRequestId },
        data: { status: "PROCUREMENT_PROCESS" },
        select: { docControlNo: true, requestedBy: true },
      });
      await notify(
        mr.requestedBy,
        `Pengadaan dimulai untuk MR ${mr.docControlNo} (PO ${po.poNumber}).`,
        "/engineer/material-request",
      );
    }

    revalidatePath("/procurement");
    revalidatePath("/procurement/po-plan");
    revalidatePath("/procurement/po-list");

    return { success: true, data: po };
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return { success: false, error: error.message };
  }
}

// ─── Get Purchase Orders ──────────────────────────────────────────────────────

/**
 * Fetch POs with optional filters
 */
export async function getPurchaseOrders(filters = {}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view POs.");
    }

    const { year, projectCode, status, health } = filters;

    const where = {};

    if (projectCode) where.projectCode = projectCode;
    if (status) where.status = status;

    // Filter by year if provided
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      where.createdAt = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: true,
        invoices: true,
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate health for each PO
    const posWithHealth = pos.map(po => ({
      ...po,
      poHealth: calculatePOHealth(po),
    }));

    // Filter by health if provided
    if (health) {
      return {
        success: true,
        data: posWithHealth.filter(po => po.poHealth === health),
      };
    }

    return { success: true, data: posWithHealth };
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return { success: false, error: error.message };
  }
}

// ─── Get Purchase Order by ID ────────────────────────────────────────────────

/**
 * Fetch single PO with all details
 */
export async function getPurchaseOrderById(id) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view PO details.");
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        invoices: true,
        creator: { select: { name: true } }, // User tak punya field email
        materialRequest: { select: { docControlNo: true } },
      },
    });

    if (!po) {
      return { success: false, error: "PO not found" };
    }

    const poWithHealth = {
      ...po,
      poHealth: calculatePOHealth(po),
    };

    return { success: true, data: poWithHealth };
  } catch (error) {
    console.error("Error fetching PO by ID:", error);
    return { success: false, error: error.message };
  }
}

// ─── Update PO Item ───────────────────────────────────────────────────────────

/**
 * Update PO item (price, qty, Mat In date, etc.)
 */
// Inti update item PO tanpa cek role — dipakai bersama updatePOItem
// (guard PROCUREMENT) dan markItemReceived (guard PROCUREMENT|WAREHOUSE).
// Sebelumnya markItemReceived memanggil updatePOItem, sehingga guard
// PROCUREMENT di dalam updatePOItem MENOLAK role WAREHOUSE — Goods Receipt
// oleh gudang selalu gagal. Guard dipindah ke pemanggil, logika di sini.
async function applyPOItemUpdate(itemId, data) {
  const {
    description,
    partNumber,
    qty,
    unit,
    unitPrice,
    totalPrice,
    prNo,
    prDate,
    prProcessDate,
    matIn,
    receivedQty,
  } = data;

  const updateData = {};
  if (description !== undefined) updateData.description = description;
  if (partNumber !== undefined) updateData.partNumber = partNumber;
  if (qty !== undefined) updateData.qty = parseInt(qty);
  if (unit !== undefined) updateData.unit = unit;
  if (unitPrice !== undefined) updateData.unitPrice = parseFloat(unitPrice);
  if (totalPrice !== undefined) updateData.totalPrice = parseFloat(totalPrice);
  if (prNo !== undefined) updateData.prNo = prNo;
  if (prDate !== undefined) updateData.prDate = prDate ? new Date(prDate) : null;
  if (prProcessDate !== undefined) updateData.prProcessDate = prProcessDate ? new Date(prProcessDate) : null;
  if (matIn !== undefined) updateData.matIn = matIn ? new Date(matIn) : null;
  if (receivedQty !== undefined) updateData.receivedQty = parseInt(receivedQty);

  const updatedItem = await prisma.pOItem.update({
    where: { id: itemId },
    data: updateData,
    include: { po: { include: { items: true } } },
  });

  // Recalculate PO health
  const po = updatedItem.po;
  const health = calculatePOHealth(po);

  // Update PO status based on received items
  const allItemsReceived = po.items.every(item => item.matIn);
  const someItemsReceived = po.items.some(item => item.matIn);

  let newStatus = po.status;
  if (allItemsReceived && po.status !== "FULL_RECEIVED") {
    newStatus = "FULL_RECEIVED";
  } else if (someItemsReceived && po.status === "RELEASED") {
    newStatus = "PARTIAL_RECEIVED";
  }

  if (newStatus !== po.status || health !== po.poHealth) {
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        poHealth: health,
        status: newStatus,
      },
    });
  }

  // Saat PO baru saja jadi (sebagian/penuh) diterima dan berasal dari MR:
  // wire status MR → AVAILABLE_IN_WAREHOUSE + beri tahu Requestor & pembuat PO.
  // Digating pada perubahan status (bukan tiap edit) agar notifikasi tidak dobel.
  const becameReceived =
    newStatus !== po.status &&
    (newStatus === "PARTIAL_RECEIVED" || newStatus === "FULL_RECEIVED");
  if (becameReceived && po.materialRequestId) {
    const mr = await prisma.materialRequest.update({
      where: { id: po.materialRequestId },
      data: { status: "AVAILABLE_IN_WAREHOUSE" },
      select: { docControlNo: true, requestedBy: true },
    });
    const label = newStatus === "FULL_RECEIVED" ? "seluruhnya" : "sebagian";
    await notify(
      mr.requestedBy,
      `Barang untuk MR ${mr.docControlNo} sudah ${label} tersedia di gudang.`,
      "/engineer/material-request",
    );
    await notify(
      po.createdBy,
      `Goods Receipt ${label} untuk PO ${po.poNumber} (MR ${mr.docControlNo}).`,
      "/procurement/po-list",
    );
    revalidatePath("/engineer/material-request");
  }

  revalidatePath("/procurement/po-plan");
  revalidatePath("/procurement/po-list");
  revalidatePath("/warehouse/goods-receipt");
  revalidatePath("/warehouse");

  return { success: true, data: updatedItem };
}

export async function updatePOItem(itemId, data) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can update items.");
    }
    return await applyPOItemUpdate(itemId, data);
  } catch (error) {
    console.error("Error updating PO item:", error);
    return { success: false, error: error.message };
  }
}

// ─── Mark Item Received ───────────────────────────────────────────────────────

/**
 * Mark item as received with matIn date. Diizinkan untuk Procurement DAN
 * Warehouse (Goods Receipt di modul /warehouse).
 */
export async function markItemReceived(itemId, matInDate) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "PROCUREMENT" && session.user.role !== "WAREHOUSE")) {
      throw new Error("Unauthorized: Only Procurement/Warehouse can mark items received.");
    }
    return await applyPOItemUpdate(itemId, { matIn: matInDate });
  } catch (error) {
    console.error("Error marking item received:", error);
    return { success: false, error: error.message };
  }
}

// ─── Add Invoice ──────────────────────────────────────────────────────────────

/**
 * Add invoice to PO
 */
export async function addInvoice(poId, invoiceData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can add invoices.");
    }

    const { invoiceNo, invoiceDate, amount, notes } = invoiceData;

    const invoice = await prisma.pOInvoice.create({
      data: {
        poId,
        invoiceNo,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        amount: amount ? parseFloat(amount) : null,
        notes,
      },
    });

    revalidatePath(`/procurement/po-list/${poId}`);
    revalidatePath("/procurement/po-list");

    return { success: true, data: invoice };
  } catch (error) {
    console.error("Error adding invoice:", error);
    return { success: false, error: error.message };
  }
}

// ─── Update Invoice ───────────────────────────────────────────────────────────

/**
 * Update invoice details
 */
export async function updateInvoice(invoiceId, invoiceData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can update invoices.");
    }

    const {
      invoiceNo,
      invoiceDate,
      amount,
      isPaid,
      paidAt,
      notes,
    } = invoiceData;

    const updateData = {};
    if (invoiceNo !== undefined) updateData.invoiceNo = invoiceNo;
    if (invoiceDate !== undefined) updateData.invoiceDate = invoiceDate ? new Date(invoiceDate) : null;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (isPaid !== undefined) updateData.isPaid = isPaid;
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null;
    if (notes !== undefined) updateData.notes = notes;

    const invoice = await prisma.pOInvoice.findUnique({
      where: { id: invoiceId },
    });

    const updatedInvoice = await prisma.pOInvoice.update({
      where: { id: invoiceId },
      data: updateData,
    });

    revalidatePath(`/procurement/po-list/${invoice.poId}`);
    revalidatePath("/procurement/po-list");

    return { success: true, data: updatedInvoice };
  } catch (error) {
    console.error("Error updating invoice:", error);
    return { success: false, error: error.message };
  }
}
