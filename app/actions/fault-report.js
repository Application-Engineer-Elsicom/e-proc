"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { getInitialApprovalStatus } from "../lib/permissions";

/**
 * Generate Fault Report Number (Format: FR-YYYY-XXXX)
 */
async function generateFaultDocNo() {
  const year = new Date().getFullYear();
  const lastFR = await prisma.faultReport.findFirst({
    where: { docNo: { startsWith: `FR-${year}-` } },
    orderBy: { docNo: 'desc' }
  });

  if (!lastFR) return `FR-${year}-0001`;

  const lastNumberStr = lastFR.docNo.split('-')[2];
  const nextNumber = parseInt(lastNumberStr, 10) + 1;
  const paddedNumber = nextNumber.toString().padStart(4, '0');
  return `FR-${year}-${paddedNumber}`;
}

/**
 * Create a new Fault Report
 * Auto-detects initial approvalStatus based on creator's engineerRole.
 * The technical status (OPEN/IN_PROGRESS/CLOSED) is separate from approval chain.
 */
export async function createFaultReport(data) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const docNo = await generateFaultDocNo();

    // Auto-detect initial approval status based on engineer sub-role
    const initialApprovalStatus = getInitialApprovalStatus(session.user.engineerRole);

    const newFR = await prisma.faultReport.create({
      data: {
        docNo,
        projectId:     data.projectId,
        projectName:   data.projectName,
        itemName:      data.itemName,
        manufacturer:  data.manufacturer,
        targetRepair:  data.targetRepair ? new Date(data.targetRepair) : null,
        faultIssue:    data.faultIssue,
        priority:      data.priority,
        description:   data.description,
        status:        "OPEN",                // Technical status
        approvalStatus: initialApprovalStatus, // Approval chain status
        reportedBy:    session.user.id.toString(),
      }
    });

    revalidatePath("/engineer/fault-report");
    return { success: true, data: newFR };
  } catch (error) {
    console.error("Error creating fault report:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Fault Reports — role-based filtering:
 *   STAFF  → own submissions
 *   WPO    → own + WAITING_WPO queue
 *   SYSTEM → own + WAITING_SYSTEM queue
 *   PM     → WAITING_PM + resolved
 */
export async function getFaultReports() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const { role, engineerRole, id } = session.user;

    let reports;

    if (role === "ENGINEER") {
      if (engineerRole === "STAFF") {
        reports = await prisma.faultReport.findMany({
          where: { reportedBy: id },
          orderBy: { createdAt: "desc" },
          include: { reporter: true }
        });
      } else if (engineerRole === "WPO") {
        reports = await prisma.faultReport.findMany({
          where: {
            OR: [
              { reportedBy: id },
              { approvalStatus: "WAITING_WPO" }
            ]
          },
          orderBy: { createdAt: "desc" },
          include: { reporter: true }
        });
      } else if (engineerRole === "SYSTEM") {
        reports = await prisma.faultReport.findMany({
          where: {
            OR: [
              { reportedBy: id },
              { approvalStatus: "WAITING_SYSTEM" }
            ]
          },
          orderBy: { createdAt: "desc" },
          include: { reporter: true }
        });
      } else {
        reports = await prisma.faultReport.findMany({
          where: { reportedBy: id },
          orderBy: { createdAt: "desc" },
          include: { reporter: true }
        });
      }
    } else if (role === "PROJECT_MANAGER") {
      reports = await prisma.faultReport.findMany({
        where: { approvalStatus: { in: ["WAITING_PM", "APPROVED", "REJECTED"] } },
        orderBy: { createdAt: "desc" },
        include: { reporter: true, wpoApprover: true, systemApprover: true }
      });
    } else {
      reports = await prisma.faultReport.findMany({
        orderBy: { createdAt: "desc" },
        include: { reporter: true }
      });
    }

    return { success: true, data: reports };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── Approval Level 1 — Engineer WPO ─────────────────────────────────────────

/**
 * Approve Fault Report by Engineer WPO
 * approvalStatus: WAITING_WPO → WAITING_SYSTEM
 */
export async function approveFRByWpo(frId) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "WPO") {
      throw new Error("Unauthorized: Only Engineer WPO can perform this action.");
    }

    const fr = await prisma.faultReport.findUnique({ where: { id: frId } });
    if (!fr) throw new Error("Fault Report tidak ditemukan.");
    if (fr.approvalStatus !== "WAITING_WPO") {
      throw new Error(`Status tidak valid. Saat ini: ${fr.approvalStatus}`);
    }

    const updated = await prisma.faultReport.update({
      where: { id: frId },
      data: {
        approvalStatus: "WAITING_SYSTEM",
        wpoApprovedBy:  session.user.id,
        wpoApprovedAt:  new Date(),
        status:         "IN_PROGRESS", // Update technical status
      }
    });

    revalidatePath("/engineer/fault-report");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error approving FR by WPO:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject Fault Report by Engineer WPO
 */
export async function rejectFRByWpo(frId, reason) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "WPO") {
      throw new Error("Unauthorized: Only Engineer WPO can perform this action.");
    }

    const fr = await prisma.faultReport.findUnique({ where: { id: frId } });
    if (!fr) throw new Error("Fault Report tidak ditemukan.");
    if (fr.approvalStatus !== "WAITING_WPO") {
      throw new Error("Status tidak valid untuk WPO rejection.");
    }

    const updated = await prisma.faultReport.update({
      where: { id: frId },
      data: {
        approvalStatus: "REJECTED",
        status:         "CLOSED",
        description:    fr.description
          ? `${fr.description}\n\n[DITOLAK WPO: ${reason || '-'}]`
          : `[DITOLAK WPO: ${reason || '-'}]`,
      }
    });

    revalidatePath("/engineer/fault-report");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error rejecting FR by WPO:", error);
    return { success: false, error: error.message };
  }
}

// ─── Approval Level 2 — Engineer SYSTEM ──────────────────────────────────────

/**
 * Approve Fault Report by Engineer SYSTEM
 * approvalStatus: WAITING_SYSTEM → WAITING_PM
 */
export async function approveFRBySystem(frId) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "SYSTEM") {
      throw new Error("Unauthorized: Only Engineer SYSTEM can perform this action.");
    }

    const fr = await prisma.faultReport.findUnique({ where: { id: frId } });
    if (!fr) throw new Error("Fault Report tidak ditemukan.");
    if (fr.approvalStatus !== "WAITING_SYSTEM") {
      throw new Error(`Status tidak valid. Saat ini: ${fr.approvalStatus}`);
    }

    const updated = await prisma.faultReport.update({
      where: { id: frId },
      data: {
        approvalStatus:   "WAITING_PM",
        systemApprovedBy: session.user.id,
        systemApprovedAt: new Date(),
      }
    });

    revalidatePath("/engineer/fault-report");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error approving FR by SYSTEM:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject Fault Report by Engineer SYSTEM
 */
export async function rejectFRBySystem(frId, reason) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "SYSTEM") {
      throw new Error("Unauthorized: Only Engineer SYSTEM can perform this action.");
    }

    const fr = await prisma.faultReport.findUnique({ where: { id: frId } });
    if (!fr) throw new Error("Fault Report tidak ditemukan.");
    if (fr.approvalStatus !== "WAITING_SYSTEM") {
      throw new Error("Status tidak valid untuk SYSTEM rejection.");
    }

    const updated = await prisma.faultReport.update({
      where: { id: frId },
      data: {
        approvalStatus: "REJECTED",
        status:         "CLOSED",
        description:    fr.description
          ? `${fr.description}\n\n[DITOLAK SYSTEM: ${reason || '-'}]`
          : `[DITOLAK SYSTEM: ${reason || '-'}]`,
      }
    });

    revalidatePath("/engineer/fault-report");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error rejecting FR by SYSTEM:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update technical status of Fault Report (OPEN / IN_PROGRESS / CLOSED)
 * Available to the reporter and WPO/SYSTEM engineers
 */
export async function updateFaultReportStatus(frId, newStatus) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const fr = await prisma.faultReport.findUnique({ where: { id: frId } });
    if (!fr) throw new Error("Fault Report tidak ditemukan.");

    const validStatuses = ["OPEN", "IN_PROGRESS", "CLOSED"];
    if (!validStatuses.includes(newStatus)) throw new Error("Status tidak valid.");

    const updated = await prisma.faultReport.update({
      where: { id: frId },
      data: { status: newStatus }
    });

    revalidatePath("/engineer/fault-report");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating FR status:", error);
    return { success: false, error: error.message };
  }
}
