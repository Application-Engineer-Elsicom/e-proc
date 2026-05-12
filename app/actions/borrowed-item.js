"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

// ─── Generate Borrowed Document Number ───────────────────────────────────────

/**
 * Generate next borrowed document number
 * Format: BR-2026-XXXX
 */
async function generateBorrowedDocNo() {
  const year = new Date().getFullYear();
  const prefix = `BR-${year}-`;

  const lastBorrowed = await prisma.borrowedItem.findMany({
    where: {
      docNo: {
        startsWith: prefix,
      },
    },
    orderBy: { docNo: "desc" },
    take: 1,
  });

  let nextNumber = 1;
  if (lastBorrowed.length > 0) {
    const match = lastBorrowed[0].docNo.match(/BR-\d+-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

// ─── Create Borrowed Item ────────────────────────────────────────────────────

/**
 * Create borrowed item record
 * processedBy: Head of Procurement (typically PROCUREMENT role)
 */
export async function createBorrowedItem(data) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can create borrowed items.");
    }

    const {
      fromProjectId,
      fromProjectName,
      toProjectId,
      toProjectName,
      description,
      partNumber,
      qty,
      unit,
      dueDate,
    } = data;

    if (!fromProjectId || !toProjectId) {
      throw new Error("Both fromProjectId and toProjectId are required.");
    }

    const docNo = await generateBorrowedDocNo();

    const borrowed = await prisma.borrowedItem.create({
      data: {
        docNo,
        fromProjectId,
        fromProjectName,
        toProjectId,
        toProjectName,
        description,
        partNumber,
        qty: parseInt(qty),
        unit,
        dueDate: dueDate ? new Date(dueDate) : null,
        processedBy: session.user.id.toString(),
        status: "BORROWED",
      },
    });

    revalidatePath("/procurement/po-plan");

    return { success: true, data: borrowed };
  } catch (error) {
    console.error("Error creating borrowed item:", error);
    return { success: false, error: error.message };
  }
}

// ─── Get Borrowed Items ───────────────────────────────────────────────────────

/**
 * Fetch borrowed items with optional filters
 */
export async function getBorrowedItems(filters = {}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view borrowed items.");
    }

    const { fromProjectId, toProjectId, status } = filters;

    const where = {};

    if (fromProjectId) where.fromProjectId = fromProjectId;
    if (toProjectId) where.toProjectId = toProjectId;
    if (status) where.status = status;

    const borrowed = await prisma.borrowedItem.findMany({
      where,
      include: {
        processor: { select: { name: true, email: true } },
      },
      orderBy: { borrowDate: "desc" },
    });

    return { success: true, data: borrowed };
  } catch (error) {
    console.error("Error fetching borrowed items:", error);
    return { success: false, error: error.message };
  }
}

// ─── Mark as Returned ────────────────────────────────────────────────────────

/**
 * Mark borrowed item as returned
 */
export async function markAsReturned(id, returnNotes = "") {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can mark items as returned.");
    }

    const borrowed = await prisma.borrowedItem.update({
      where: { id },
      data: {
        status: "RETURNED",
        returnedAt: new Date(),
        returnNotes: returnNotes || null,
      },
    });

    revalidatePath("/procurement/po-plan");

    return { success: true, data: borrowed };
  } catch (error) {
    console.error("Error marking borrowed item as returned:", error);
    return { success: false, error: error.message };
  }
}
