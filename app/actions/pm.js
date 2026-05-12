"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

// ─── Material Request ─────────────────────────────────────────────────────────

/**
 * Approve a Material Request by PM
 * FLOW: WAITING_PM → APPROVED
 */
export async function approveMaterialRequestPM(id) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "PROJECT_MANAGER") {
      throw new Error("Unauthorized: Only PM can approve requests.");
    }

    const updatedMR = await prisma.materialRequest.update({
      where: { id },
      data: {
        status:       "APPROVED",
        pmApprovedBy: session.user.id.toString(),
        pmApprovedAt: new Date(),
      },
    });

    revalidatePath("/pm");
    revalidatePath("/engineer/material-request");

    return { success: true, data: updatedMR };
  } catch (error) {
    console.error("Error approving request (PM):", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a Material Request by PM
 */
export async function rejectMaterialRequestPM(id, reason) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "PROJECT_MANAGER") {
      throw new Error("Unauthorized: Only PM can reject requests.");
    }

    const updatedMR = await prisma.materialRequest.update({
      where: { id },
      data: {
        status:     "REJECTED",
        keterangan: reason ? `REJECTED BY PM: ${reason}` : "REJECTED BY PM",
      },
    });

    revalidatePath("/pm");
    revalidatePath("/engineer/material-request");

    return { success: true, data: updatedMR };
  } catch (error) {
    console.error("Error rejecting request (PM):", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all MRs waiting for PM approval
 */
export async function getPendingPMRequests() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROJECT_MANAGER") throw new Error("Unauthorized");

    const requests = await prisma.materialRequest.findMany({
      where: { status: "WAITING_PM" },
      orderBy: { createdAt: "asc" },
      include: { items: true, requester: true, wpoApprover: true, systemApprover: true }
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Error fetching PM requests:", error);
    return { success: false, error: error.message };
  }
}

// ─── Fault Report ─────────────────────────────────────────────────────────────

/**
 * Approve Fault Report by PM
 * approvalStatus: WAITING_PM → APPROVED
 */
export async function approveFaultReportPM(frId) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROJECT_MANAGER") {
      throw new Error("Unauthorized: Only PM can approve Fault Reports.");
    }

    const fr = await prisma.faultReport.findUnique({ where: { id: frId } });
    if (!fr) throw new Error("Fault Report tidak ditemukan.");
    if (fr.approvalStatus !== "WAITING_PM") {
      throw new Error(`Status tidak valid. Saat ini: ${fr.approvalStatus}`);
    }

    const updated = await prisma.faultReport.update({
      where: { id: frId },
      data: {
        approvalStatus: "APPROVED",
        pmApprovedBy:   session.user.id,
        pmApprovedAt:   new Date(),
      }
    });

    revalidatePath("/pm");
    revalidatePath("/engineer/fault-report");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error approving FR by PM:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject Fault Report by PM
 */
export async function rejectFaultReportPM(frId, reason) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROJECT_MANAGER") {
      throw new Error("Unauthorized: Only PM can reject Fault Reports.");
    }

    const fr = await prisma.faultReport.findUnique({ where: { id: frId } });
    if (!fr) throw new Error("Fault Report tidak ditemukan.");
    if (fr.approvalStatus !== "WAITING_PM") {
      throw new Error("Status tidak valid untuk PM rejection.");
    }

    const updated = await prisma.faultReport.update({
      where: { id: frId },
      data: {
        approvalStatus: "REJECTED",
        status:         "CLOSED",
        description:    fr.description
          ? `${fr.description}\n\n[DITOLAK PM: ${reason || '-'}]`
          : `[DITOLAK PM: ${reason || '-'}]`,
      }
    });

    revalidatePath("/pm");
    revalidatePath("/engineer/fault-report");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error rejecting FR by PM:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Fault Reports pending PM approval
 */
export async function getPendingFRForPM() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROJECT_MANAGER") throw new Error("Unauthorized");

    const reports = await prisma.faultReport.findMany({
      where: { approvalStatus: "WAITING_PM" },
      orderBy: { createdAt: "asc" },
      include: { reporter: true, wpoApprover: true, systemApprover: true }
    });

    return { success: true, data: reports };
  } catch (error) {
    console.error("Error fetching FR for PM:", error);
    return { success: false, error: error.message };
  }
}

// ─── Warehouse Release ────────────────────────────────────────────────────────

/**
 * Approve Warehouse Release by PM
 * WAITING_PM → APPROVED
 */
export async function approveWarehouseReleasePM(wrId) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROJECT_MANAGER") {
      throw new Error("Unauthorized: Only PM can approve Warehouse Releases.");
    }

    const wr = await prisma.warehouseRelease.findUnique({ where: { id: wrId } });
    if (!wr) throw new Error("Warehouse Release tidak ditemukan.");
    if (wr.status !== "WAITING_PM") {
      throw new Error(`Status tidak valid. Saat ini: ${wr.status}`);
    }

    const updated = await prisma.warehouseRelease.update({
      where: { id: wrId },
      data: {
        status:       "APPROVED",
        pmApprovedBy: session.user.id,
        pmApprovedAt: new Date(),
      }
    });

    revalidatePath("/pm");
    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error approving WR by PM:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject Warehouse Release by PM
 */
export async function rejectWarehouseReleasePM(wrId, reason) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROJECT_MANAGER") {
      throw new Error("Unauthorized: Only PM can reject Warehouse Releases.");
    }

    const wr = await prisma.warehouseRelease.findUnique({ where: { id: wrId } });
    if (!wr) throw new Error("Warehouse Release tidak ditemukan.");
    if (wr.status !== "WAITING_PM") {
      throw new Error("Status tidak valid untuk PM rejection.");
    }

    const updated = await prisma.warehouseRelease.update({
      where: { id: wrId },
      data: { status: "REJECTED" }
    });

    revalidatePath("/pm");
    revalidatePath("/engineer/warehouse-release");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error rejecting WR by PM:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Warehouse Releases pending PM approval
 */
export async function getPendingWRForPM() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROJECT_MANAGER") throw new Error("Unauthorized");

    const releases = await prisma.warehouseRelease.findMany({
      where: { status: "WAITING_PM" },
      orderBy: { createdAt: "asc" },
      include: { items: true, requester: true, materialRequest: true, wpoApprover: true, systemApprover: true }
    });

    return { success: true, data: releases };
  } catch (error) {
    console.error("Error fetching WR for PM:", error);
    return { success: false, error: error.message };
  }
}
