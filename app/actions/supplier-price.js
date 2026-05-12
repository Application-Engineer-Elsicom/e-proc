"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

// ─── Create Supplier Price ────────────────────────────────────────────────────

/**
 * Create/add new supplier price entry
 */
export async function createSupplierPrice(data) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can create supplier prices.");
    }

    const {
      supplierName,
      description,
      partNumber,
      unit,
      unitPrice,
      currency = "IDR",
      notes,
    } = data;

    if (!supplierName || !description || !unitPrice) {
      throw new Error("supplierName, description, and unitPrice are required.");
    }

    const price = await prisma.supplierPrice.create({
      data: {
        supplierName,
        description,
        partNumber,
        unit,
        unitPrice: parseFloat(unitPrice),
        currency,
        notes,
        inputBy: session.user.id.toString(),
      },
    });

    revalidatePath("/procurement/po-list");

    return { success: true, data: price };
  } catch (error) {
    console.error("Error creating supplier price:", error);
    return { success: false, error: error.message };
  }
}

// ─── Get Supplier Prices ──────────────────────────────────────────────────────

/**
 * Fetch supplier prices with optional filters
 */
export async function getSupplierPrices(filters = {}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view supplier prices.");
    }

    const { supplierName, partNumber, search } = filters;

    const where = {};

    if (supplierName) where.supplierName = supplierName;
    if (partNumber) where.partNumber = partNumber;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { partNumber: { contains: search, mode: "insensitive" } },
        { supplierName: { contains: search, mode: "insensitive" } },
      ];
    }

    const prices = await prisma.supplierPrice.findMany({
      where,
      include: {
        inputter: { select: { name: true, email: true } },
      },
      orderBy: [{ supplierName: "asc" }, { description: "asc" }],
    });

    return { success: true, data: prices };
  } catch (error) {
    console.error("Error fetching supplier prices:", error);
    return { success: false, error: error.message };
  }
}

// ─── Update Supplier Price ────────────────────────────────────────────────────

/**
 * Update supplier price entry
 */
export async function updateSupplierPrice(id, data) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can update supplier prices.");
    }

    const {
      supplierName,
      description,
      partNumber,
      unit,
      unitPrice,
      currency,
      notes,
    } = data;

    const updateData = {};
    if (supplierName !== undefined) updateData.supplierName = supplierName;
    if (description !== undefined) updateData.description = description;
    if (partNumber !== undefined) updateData.partNumber = partNumber;
    if (unit !== undefined) updateData.unit = unit;
    if (unitPrice !== undefined) updateData.unitPrice = parseFloat(unitPrice);
    if (currency !== undefined) updateData.currency = currency;
    if (notes !== undefined) updateData.notes = notes;

    const price = await prisma.supplierPrice.update({
      where: { id },
      data: updateData,
      include: {
        inputter: { select: { name: true, email: true } },
      },
    });

    revalidatePath("/procurement/po-list");

    return { success: true, data: price };
  } catch (error) {
    console.error("Error updating supplier price:", error);
    return { success: false, error: error.message };
  }
}

// ─── Delete Supplier Price ────────────────────────────────────────────────────

/**
 * Delete supplier price entry
 */
export async function deleteSupplierPrice(id) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can delete supplier prices.");
    }

    const price = await prisma.supplierPrice.delete({
      where: { id },
    });

    revalidatePath("/procurement/po-list");

    return { success: true, data: price };
  } catch (error) {
    console.error("Error deleting supplier price:", error);
    return { success: false, error: error.message };
  }
}

// ─── Get Suppliers List ───────────────────────────────────────────────────────

/**
 * Get unique list of suppliers
 */
export async function getSuppliers() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view suppliers.");
    }

    const suppliers = await prisma.supplierPrice.findMany({
      distinct: ["supplierName"],
      select: { supplierName: true },
      orderBy: { supplierName: "asc" },
    });

    const supplierList = suppliers.map(s => s.supplierName);

    return { success: true, data: supplierList };
  } catch (error) {
    console.error("Error fetching suppliers list:", error);
    return { success: false, error: error.message };
  }
}
