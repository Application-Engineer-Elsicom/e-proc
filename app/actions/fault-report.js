"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

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
 */
export async function createFaultReport(data) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const docNo = await generateFaultDocNo();

    const newFR = await prisma.faultReport.create({
      data: {
        docNo,
        projectId: data.projectId, // New
        projectName: data.projectName,
        itemName: data.itemName, // New
        manufacturer: data.manufacturer, // New
        targetRepair: data.targetRepair ? new Date(data.targetRepair) : null, // New
        faultIssue: data.faultIssue, // New
        priority: data.priority,
        description: data.description,
        status: "OPEN",
        reportedBy: session.user.id.toString(),
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
 * Get Fault Reports for the current user
 */
export async function getFaultReports() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const reports = await prisma.faultReport.findMany({
      orderBy: { createdAt: "desc" },
      include: { reporter: true }
    });

    return { success: true, data: reports };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
