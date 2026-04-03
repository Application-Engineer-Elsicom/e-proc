"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

/**
 * Approve a Material Request by WPO
 * FLOW: ENGINEER -> WAITING_WPO -> WPO Approve -> WAITING_PM
 */
export async function approveMaterialRequest(id) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "WPO") {
      throw new Error("Unauthorized: Only WPO can approve requests.");
    }

    const updatedMR = await prisma.materialRequest.update({
      where: { id },
      data: {
        status: "WAITING_PM", // Now it goes to PM instead of being final
        wpoApprovedBy: session.user.id.toString(),
      },
    });

    revalidatePath("/wpo");
    revalidatePath("/engineer/material-request");
    
    return { success: true, data: updatedMR };
  } catch (error) {
    console.error("Error approving request (WPO):", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a Material Request by WPO
 */
export async function rejectMaterialRequest(id, reason) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "WPO") {
      throw new Error("Unauthorized: Only WPO can reject requests.");
    }

    const updatedMR = await prisma.materialRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        keterangan: reason ? `REJECTED BY WPO: ${reason}` : "REJECTED BY WPO",
      },
    });

    revalidatePath("/wpo");
    revalidatePath("/engineer/material-request");
    
    return { success: true, data: updatedMR };
  } catch (error) {
    console.error("Error rejecting request (WPO):", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all MRs waiting for WPO approval
 */
export async function getPendingWPORequests() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "WPO") throw new Error("Unauthorized");

    const requests = await prisma.materialRequest.findMany({
      where: { status: "WAITING_WPO" },
      orderBy: { createdAt: "asc" },
      include: { items: true, requester: true }
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Error fetching WPO requests:", error);
    return { success: false, error: error.message };
  }
}
