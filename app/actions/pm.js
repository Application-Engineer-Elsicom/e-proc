"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

/**
 * Approve a Material Request by PM
 * FLOW: WAITING_PM -> PM Approve -> APPROVED
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
        status: "APPROVED", // PM is the final approval in this stage
        pmApprovedBy: session.user.id.toString(),
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
        status: "REJECTED",
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
      include: { items: true, requester: true, wpoApprover: true }
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Error fetching PM requests:", error);
    return { success: false, error: error.message };
  }
}
