"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { getInitialApprovalStatus } from "../lib/permissions";

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
    const mrs = await prisma.materialRequest.findMany({
      where: { status: "APPROVED" },
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

    // Auto-detect initial status based on engineer sub-role
    const initialStatus = getInitialApprovalStatus(session.user.engineerRole);

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
        status:            initialStatus,
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

    const { role, engineerRole, id } = session.user;

    let releases;

    if (role === "ENGINEER") {
      if (engineerRole === "STAFF") {
        releases = await prisma.warehouseRelease.findMany({
          where: { requesterId: id },
          orderBy: { createdAt: "desc" },
          include: { items: true, requester: true, materialRequest: true }
        });
      } else if (engineerRole === "WPO") {
        releases = await prisma.warehouseRelease.findMany({
          where: {
            OR: [
              { requesterId: id },
              { status: "WAITING_WPO" }
            ]
          },
          orderBy: { createdAt: "desc" },
          include: { items: true, requester: true, materialRequest: true }
        });
      } else if (engineerRole === "SYSTEM") {
        releases = await prisma.warehouseRelease.findMany({
          where: {
            OR: [
              { requesterId: id },
              { status: "WAITING_SYSTEM" }
            ]
          },
          orderBy: { createdAt: "desc" },
          include: { items: true, requester: true, materialRequest: true }
        });
      } else {
        releases = await prisma.warehouseRelease.findMany({
          where: { requesterId: id },
          orderBy: { createdAt: "desc" },
          include: { items: true, requester: true, materialRequest: true }
        });
      }
    } else if (role === "PROJECT_MANAGER") {
      releases = await prisma.warehouseRelease.findMany({
        where: { status: { in: ["WAITING_PM", "APPROVED", "REJECTED"] } },
        orderBy: { createdAt: "desc" },
        include: { items: true, requester: true, materialRequest: true, wpoApprover: true, systemApprover: true }
      });
    } else {
      releases = await prisma.warehouseRelease.findMany({
        orderBy: { createdAt: "desc" },
        include: { items: true, requester: true, materialRequest: true }
      });
    }

    return { success: true, data: releases };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── Approval Level 1 — Engineer WPO ─────────────────────────────────────────

/**
 * Approve Warehouse Release by Engineer WPO
 * WAITING_WPO → WAITING_SYSTEM
 */
export async function approveWRByWpo(wrId) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "WPO") {
      throw new Error("Unauthorized: Only Engineer WPO can perform this action.");
    }

    const wr = await prisma.warehouseRelease.findUnique({ where: { id: wrId } });
    if (!wr) throw new Error("Warehouse Release tidak ditemukan.");
    if (wr.status !== "WAITING_WPO") {
      throw new Error(`Status tidak valid untuk WPO approval. Status saat ini: ${wr.status}`);
    }

    const updated = await prisma.warehouseRelease.update({
      where: { id: wrId },
      data: {
        status:        "WAITING_SYSTEM",
        wpoApprovedBy: session.user.id,
        wpoApprovedAt: new Date(),
      }
    });

    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error approving WR by WPO:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject Warehouse Release by Engineer WPO
 */
export async function rejectWRByWpo(wrId, reason) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "WPO") {
      throw new Error("Unauthorized: Only Engineer WPO can perform this action.");
    }

    const wr = await prisma.warehouseRelease.findUnique({ where: { id: wrId } });
    if (!wr) throw new Error("Warehouse Release tidak ditemukan.");
    if (wr.status !== "WAITING_WPO") {
      throw new Error("Status tidak valid untuk WPO rejection.");
    }

    const updated = await prisma.warehouseRelease.update({
      where: { id: wrId },
      data: { status: "REJECTED" }
    });

    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error rejecting WR by WPO:", error);
    return { success: false, error: error.message };
  }
}

// ─── Approval Level 2 — Engineer SYSTEM ──────────────────────────────────────

/**
 * Approve Warehouse Release by Engineer SYSTEM
 * WAITING_SYSTEM → WAITING_PM
 */
export async function approveWRBySystem(wrId) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "SYSTEM") {
      throw new Error("Unauthorized: Only Engineer SYSTEM can perform this action.");
    }

    const wr = await prisma.warehouseRelease.findUnique({ where: { id: wrId } });
    if (!wr) throw new Error("Warehouse Release tidak ditemukan.");
    if (wr.status !== "WAITING_SYSTEM") {
      throw new Error(`Status tidak valid. Saat ini: ${wr.status}`);
    }

    const updated = await prisma.warehouseRelease.update({
      where: { id: wrId },
      data: {
        status:           "WAITING_PM",
        systemApprovedBy: session.user.id,
        systemApprovedAt: new Date(),
      }
    });

    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error approving WR by SYSTEM:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject Warehouse Release by Engineer SYSTEM
 */
export async function rejectWRBySystem(wrId, reason) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "SYSTEM") {
      throw new Error("Unauthorized: Only Engineer SYSTEM can perform this action.");
    }

    const wr = await prisma.warehouseRelease.findUnique({ where: { id: wrId } });
    if (!wr) throw new Error("Warehouse Release tidak ditemukan.");
    if (wr.status !== "WAITING_SYSTEM") {
      throw new Error("Status tidak valid untuk SYSTEM rejection.");
    }

    const updated = await prisma.warehouseRelease.update({
      where: { id: wrId },
      data: { status: "REJECTED" }
    });

    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error rejecting WR by SYSTEM:", error);
    return { success: false, error: error.message };
  }
}
