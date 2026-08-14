"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

/**
 * Inventory / stok gudang (Tahap 3, versi minimal). Dikelola manual oleh
 * Warehouse; ditampilkan sebagai informasi saat Procurement membuat PO.
 * Belum ada auto-reserve/potong stok — itu bagian versi penuh berikutnya.
 */

async function requireWarehouse() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "WAREHOUSE") {
    throw new Error("Unauthorized: hanya WAREHOUSE yang boleh mengelola stok.");
  }
  return session;
}

export async function getInventory() {
  try {
    const session = await getServerSession(authOptions);
    // Warehouse mengelola; Procurement boleh melihat (info saat buat PO).
    if (!session || !["WAREHOUSE", "PROCUREMENT"].includes(session.user.role)) {
      throw new Error("Unauthorized");
    }
    const items = await prisma.inventory.findMany({ orderBy: { itemName: "asc" } });
    return { success: true, data: items };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function upsertInventoryItem({ id, itemName, sku, stockQty, unit }) {
  try {
    await requireWarehouse();
    if (!itemName?.trim() || !sku?.trim() || !unit?.trim()) {
      throw new Error("Nama item, SKU, dan satuan wajib diisi.");
    }
    const qty = parseInt(stockQty, 10);
    if (Number.isNaN(qty) || qty < 0) throw new Error("Stok harus angka ≥ 0.");

    const data = { itemName: itemName.trim(), sku: sku.trim(), stockQty: qty, unit: unit.trim() };
    const item = id
      ? await prisma.inventory.update({ where: { id }, data })
      : await prisma.inventory.create({ data });

    revalidatePath("/warehouse/inventory");
    return { success: true, data: item };
  } catch (error) {
    // SKU unik: beri pesan yang jelas alih-alih error Prisma mentah.
    if (error.code === "P2002") {
      return { success: false, error: `SKU "${sku}" sudah dipakai item lain.` };
    }
    console.error("Error upserting inventory item:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteInventoryItem(id) {
  try {
    await requireWarehouse();
    await prisma.inventory.delete({ where: { id } });
    revalidatePath("/warehouse/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return { success: false, error: error.message };
  }
}
