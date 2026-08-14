"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

/**
 * Document Control (Tahap 4, Perancangan Terpadu 6.4).
 *
 * Langkah registrasi administratif tepat setelah MR disetujui PM: mencatat
 * Doc. Control No resmi + Date Released. Cakupan SEMPIT — hanya MR (tidak
 * menyentuh WR/FR, tidak menandai "Completed"). Nomor MR-2026-XXXX yang
 * di-generate otomatis saat MR dibuat dipakai sebagai default; Document
 * Control boleh memfinalisasi/menyesuaikannya lalu menetapkan Date Released.
 * MR dianggap "sudah teregistrasi" begitu dateReleased terisi.
 */

async function requireDocControl() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DOCUMENT_CONTROL") {
    throw new Error("Unauthorized: hanya Document Control yang boleh mengakses ini.");
  }
  return session;
}

/** MR yang sudah APPROVED PM tapi belum diregistrasi (dateReleased kosong). */
export async function getMRsForRegistration() {
  try {
    await requireDocControl();
    const mrs = await prisma.materialRequest.findMany({
      where: { status: "APPROVED", dateReleased: null },
      include: { requester: { select: { name: true } }, items: true },
      orderBy: { updatedAt: "asc" },
    });
    return { success: true, data: mrs };
  } catch (error) {
    console.error("Error fetching MRs for registration:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/** Riwayat MR yang sudah diregistrasi (dateReleased terisi). */
export async function getRegisteredMRs() {
  try {
    await requireDocControl();
    const mrs = await prisma.materialRequest.findMany({
      where: { dateReleased: { not: null } },
      include: { requester: { select: { name: true } } },
      orderBy: { dateReleased: "desc" },
      take: 50,
    });
    return { success: true, data: mrs };
  } catch (error) {
    console.error("Error fetching registered MRs:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/** Registrasi MR: finalisasi Doc. Control No + set Date Released. */
export async function registerMR(mrId, { docControlNo, dateReleased }) {
  try {
    await requireDocControl();
    if (!docControlNo?.trim()) throw new Error("Doc. Control No wajib diisi.");
    if (!dateReleased) throw new Error("Date Released wajib diisi.");

    const mr = await prisma.materialRequest.findUnique({ where: { id: mrId } });
    if (!mr) throw new Error("Material Request tidak ditemukan.");
    if (mr.status !== "APPROVED") {
      throw new Error(`MR harus berstatus APPROVED untuk diregistrasi (saat ini: ${mr.status}).`);
    }

    const updated = await prisma.materialRequest.update({
      where: { id: mrId },
      data: { docControlNo: docControlNo.trim(), dateReleased: new Date(dateReleased) },
    });

    revalidatePath("/document-control");
    return { success: true, data: updated };
  } catch (error) {
    if (error.code === "P2002") {
      return { success: false, error: `Doc. Control No "${docControlNo}" sudah dipakai MR lain.` };
    }
    console.error("Error registering MR:", error);
    return { success: false, error: error.message };
  }
}
