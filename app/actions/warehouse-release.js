"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { notify } from "./notification";

/**
 * Generate Warehouse Release Number (Format: WR-YYYY-XXXX)
 */
async function generateWRDocNo() {
  const year = new Date().getFullYear();
  const lastWR = await prisma.warehouseRelease.findFirst({
    where: { docNo: { startsWith: `WR-${year}-` } },
    orderBy: { docNo: 'desc' }
  });

  if (!lastWR) return `WR-${year}-0001`;

  const lastNumberStr = lastWR.docNo.split('-')[2];
  const nextNumber = parseInt(lastNumberStr, 10) + 1;
  const paddedNumber = nextNumber.toString().padStart(4, '0');
  return `WR-${year}-${paddedNumber}`;
}

/**
 * Get Approved Material Requests for Smart Pull
 */
export async function getApprovedMRs() {
  try {
    // Smart-pull WR (Perancangan Terpadu 6.2): jangan hanya APPROVED. MR yang
    // sudah masuk pengadaan / tersedia di gudang tetap harus bisa dijadikan
    // dasar WR — kalau tidak, MR "hilang" dari pilihan begitu PO-nya dibuat.
    const mrs = await prisma.materialRequest.findMany({
      where: { status: { in: ["APPROVED", "PROCUREMENT_PROCESS", "AVAILABLE_IN_WAREHOUSE"] } },
      include: { items: true, requester: true },
      orderBy: { createdAt: "desc" }
    });
    return { success: true, data: mrs };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a new Warehouse Release
 * Auto-detects initial status based on creator's engineerRole.
 */
export async function createWarehouseRelease(data) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    // Use manual docNo if provided, else generate
    const docNo = data.docNo && data.docNo.trim() !== ""
      ? data.docNo
      : await generateWRDocNo();

    const newWR = await prisma.warehouseRelease.create({
      data: {
        docNo,
        materialRequestId: data.materialRequestId || null,
        projectId:         data.projectId,
        projectName:       data.projectName,
        deliveryTarget:    data.deliveryTarget,
        deliveryLocation:  data.deliveryLocation,
        releaseDate:       data.releaseDate ? new Date(data.releaseDate) : new Date(),
        dateReleased:      data.dateReleased ? new Date(data.dateReleased) : null,
        // WR baru menunggu approval ganda Warehouse + Procurement (bukan lagi
        // rantai WPO/SYSTEM/PM). Lihat Perancangan Terpadu Bab 6.2.
        status:            "PENDING_APPROVAL",
        requesterId:       session.user.id.toString(),
        items: {
          create: data.items.map(item => ({
            reqNo:        item.reqNo,
            requestor:    item.requestor,
            approval:     item.approval,
            description:  item.description,
            elsPartNum:   item.elsPartNum,
            manufacturer: item.manufacturer,
            requestQty:   parseInt(item.requestQty, 10) || 0,
            remainingQty: parseInt(item.remainingQty, 10) || 0,
            qty:          parseInt(item.qty, 10) || 0,
            unit:         item.unit,
          }))
        }
      }
    });

    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: newWR };
  } catch (error) {
    console.error("Error creating warehouse release:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Warehouse Releases — role-based filtering:
 *   STAFF  → own submissions
 *   WPO    → own + WAITING_WPO queue
 *   SYSTEM → own + WAITING_SYSTEM queue
 *   PM     → WAITING_PM + resolved
 */
export async function getWarehouseReleases() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const { role, id } = session.user;

    // ENGINEER (Requestor) hanya melihat WR miliknya sendiri — approval WR
    // kini di modul Warehouse & Procurement, bukan lagi di Engineer.
    const where = role === "ENGINEER" ? { requesterId: id } : {};

    const releases = await prisma.warehouseRelease.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        requester: true,
        materialRequest: true,
        warehouseApprover: true,
        procurementApprover: true,
      },
    });

    return { success: true, data: releases };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * WR yang menunggu approval sisi Procurement: belum ada persetujuan Procurement
 * dan belum final. Dipakai halaman /procurement/warehouse-release.
 */
export async function getWRForProcurementApproval() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") throw new Error("Unauthorized");

    const releases = await prisma.warehouseRelease.findMany({
      where: {
        status: { in: ["PENDING_APPROVAL", "WAREHOUSE_APPROVED"] },
        procurementApprovedBy: null,
      },
      include: { items: true, requester: true, materialRequest: true, warehouseApprover: true },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: releases };
  } catch (error) {
    console.error("Error fetching WR for procurement approval:", error);
    return { success: false, error: error.message };
  }
}

// ─── Approval Ganda: Warehouse (cek fisik) + Procurement (cek pengadaan) ──────
//
// Dua persetujuan independen & paralel. WR jadi APPROVED hanya bila keduanya
// setuju; REJECTED bila salah satu menolak. Status agregat diturunkan dari
// gabungan keduanya (lihat enum WrStatus). Menggantikan rantai WPO/SYSTEM/PM.

// Status di mana approval masih boleh diproses (belum final).
const WR_OPEN_STATUSES = ["PENDING_APPROVAL", "WAREHOUSE_APPROVED", "PROCUREMENT_APPROVED"];

async function applyWRApproval(wrId, side, userId) {
  // side: "WAREHOUSE" | "PROCUREMENT". Dibungkus transaksi supaya dua approver
  // yang menekan tombol nyaris bersamaan tidak saling menimpa status agregat —
  // update mengunci baris sehingga transaksi kedua membaca hasil yang pertama.
  return prisma.$transaction(async (tx) => {
    const wr = await tx.warehouseRelease.findUnique({ where: { id: wrId } });
    if (!wr) throw new Error("Warehouse Release tidak ditemukan.");
    if (!WR_OPEN_STATUSES.includes(wr.status)) {
      throw new Error(`WR sudah final (status: ${wr.status}), tidak bisa di-approve lagi.`);
    }

    const alreadyThisSide =
      side === "WAREHOUSE" ? !!wr.warehouseApprovedBy : !!wr.procurementApprovedBy;
    if (alreadyThisSide) {
      throw new Error(`Sisi ${side} sudah menyetujui WR ini.`);
    }

    // Sisi lawan sudah approve? kalau ya → APPROVED penuh, kalau belum → status sisi ini.
    const otherApproved =
      side === "WAREHOUSE" ? !!wr.procurementApprovedBy : !!wr.warehouseApprovedBy;
    const nextStatus = otherApproved
      ? "APPROVED"
      : side === "WAREHOUSE"
        ? "WAREHOUSE_APPROVED"
        : "PROCUREMENT_APPROVED";

    const now = new Date();
    const sideData =
      side === "WAREHOUSE"
        ? { warehouseApprovedBy: userId, warehouseApprovedAt: now }
        : { procurementApprovedBy: userId, procurementApprovedAt: now };

    return tx.warehouseRelease.update({
      where: { id: wrId },
      data: { status: nextStatus, ...sideData },
    });
  });
}

async function guard(role) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== role) {
    throw new Error(`Unauthorized: hanya ${role} yang boleh melakukan aksi ini.`);
  }
  return session;
}

async function applyWRReject(wrId, side, reason) {
  const wr = await prisma.warehouseRelease.findUnique({ where: { id: wrId } });
  if (!wr) throw new Error("Warehouse Release tidak ditemukan.");
  if (!WR_OPEN_STATUSES.includes(wr.status)) {
    throw new Error(`WR sudah final (status: ${wr.status}), tidak bisa ditolak.`);
  }
  return prisma.warehouseRelease.update({
    where: { id: wrId },
    data: { status: "REJECTED", rejectedSide: side, rejectedReason: reason || null },
  });
}

// Notifikasi ke Requestor atas keputusan approval WR (Perancangan Terpadu 6.6).
async function notifyWRDecision(wr, side, approved, reason) {
  const sideLabel = side === "WAREHOUSE" ? "Warehouse" : "Procurement";
  let message;
  if (!approved) {
    message = `WR ${wr.docNo} ditolak oleh ${sideLabel}${reason ? `: ${reason}` : ""}.`;
  } else if (wr.status === "APPROVED") {
    message = `WR ${wr.docNo} disetujui penuh (Warehouse + Procurement), siap dikirim.`;
  } else {
    message = `WR ${wr.docNo} disetujui ${sideLabel}, menunggu sisi lainnya.`;
  }
  await notify(wr.requesterId, message, "/engineer/warehouse-release");
}

export async function approveWRByWarehouse(wrId) {
  try {
    const session = await guard("WAREHOUSE");
    const updated = await applyWRApproval(wrId, "WAREHOUSE", session.user.id);
    await notifyWRDecision(updated, "WAREHOUSE", true);
    revalidatePath("/warehouse");
    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error approving WR by Warehouse:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectWRByWarehouse(wrId, reason) {
  try {
    await guard("WAREHOUSE");
    const updated = await applyWRReject(wrId, "WAREHOUSE", reason);
    await notifyWRDecision(updated, "WAREHOUSE", false, reason);
    revalidatePath("/warehouse");
    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error rejecting WR by Warehouse:", error);
    return { success: false, error: error.message };
  }
}

export async function approveWRByProcurement(wrId) {
  try {
    const session = await guard("PROCUREMENT");
    const updated = await applyWRApproval(wrId, "PROCUREMENT", session.user.id);
    await notifyWRDecision(updated, "PROCUREMENT", true);
    revalidatePath("/procurement");
    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error approving WR by Procurement:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectWRByProcurement(wrId, reason) {
  try {
    await guard("PROCUREMENT");
    const updated = await applyWRReject(wrId, "PROCUREMENT", reason);
    await notifyWRDecision(updated, "PROCUREMENT", false, reason);
    revalidatePath("/procurement");
    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error rejecting WR by Procurement:", error);
    return { success: false, error: error.message };
  }
}

// ─── Kirim Barang: WR APPROVED → SHIPPED (Warehouse) ─────────────────────────
//
// Dieksekusi Warehouse setelah kedua sisi menyetujui WR. Menandai barang sudah
// dikirim. (Pengurangan stok Inventory menyusul di Tahap 3 saat model Inventory
// diaktifkan — belum ada aliran stok-masuk sekarang.)
export async function shipWarehouseRelease(wrId) {
  try {
    await guard("WAREHOUSE");
    const wr = await prisma.warehouseRelease.findUnique({ where: { id: wrId } });
    if (!wr) throw new Error("Warehouse Release tidak ditemukan.");
    if (wr.status !== "APPROVED") {
      throw new Error(`Hanya WR yang sudah APPROVED yang bisa dikirim (status: ${wr.status}).`);
    }
    const updated = await prisma.warehouseRelease.update({
      where: { id: wrId },
      data: { status: "SHIPPED", dateReleased: new Date() },
    });
    await notify(
      updated.requesterId,
      `WR ${updated.docNo} telah dikirim dari gudang.`,
      "/engineer/warehouse-release",
    );
    revalidatePath("/warehouse");
    revalidatePath("/warehouse/shipment");
    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error shipping WR:", error);
    return { success: false, error: error.message };
  }
}

/** WR yang sudah APPROVED dan siap dikirim (untuk halaman /warehouse/shipment). */
export async function getApprovedWRForShipment() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "WAREHOUSE") throw new Error("Unauthorized");
    const releases = await prisma.warehouseRelease.findMany({
      where: { status: "APPROVED" },
      include: { items: true, requester: true, materialRequest: true },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: releases };
  } catch (error) {
    console.error("Error fetching WR for shipment:", error);
    return { success: false, error: error.message };
  }
}
