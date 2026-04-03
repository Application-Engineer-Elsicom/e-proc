"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

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
 */
export async function createWarehouseRelease(data) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    // NEW: Use manual docNo if provided, else generate
    const docNo = data.docNo && data.docNo.trim() !== "" 
      ? data.docNo 
      : await generateWRDocNo();

    const newWR = await prisma.warehouseRelease.create({
      data: {
        docNo,
        materialRequestId: data.materialRequestId || null, // Linked MR
        projectId: data.projectId,
        projectName: data.projectName,
        deliveryTarget: data.deliveryTarget,
        deliveryLocation: data.deliveryLocation,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : new Date(),
        dateReleased: data.dateReleased ? new Date(data.dateReleased) : null,
        requesterId: session.user.id.toString(),
        items: {
          create: data.items.map(item => ({
            reqNo: item.reqNo,
            requestor: item.requestor,
            approval: item.approval,
            description: item.description,
            elsPartNum: item.elsPartNum,
            manufacturer: item.manufacturer,
            requestQty: parseInt(item.requestQty, 10) || 0,
            remainingQty: parseInt(item.remainingQty, 10) || 0,
            qty: parseInt(item.qty, 10) || 0, // Release Qty
            unit: item.unit
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
 * Get Warehouse Releases
 */
export async function getWarehouseReleases() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const releases = await prisma.warehouseRelease.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true, requester: true, materialRequest: true }
    });

    return { success: true, data: releases };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
