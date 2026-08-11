"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { getInitialApprovalStatus } from "../lib/permissions";
import fs from "fs/promises";
import path from "path";

/**
 * Generate Document Control Number (Format: MR-2026-XXXX)
 */
async function generateDocControlNo() {
  const year = new Date().getFullYear();
  const lastMR = await prisma.materialRequest.findFirst({
    where: { docControlNo: { startsWith: `MR-${year}-` } },
    orderBy: { docControlNo: 'desc' }
  });

  if (!lastMR) return `MR-${year}-0001`;

  const lastNumberStr = lastMR.docControlNo.split('-')[2];
  const nextNumber = parseInt(lastNumberStr, 10) + 1;
  const paddedNumber = nextNumber.toString().padStart(4, '0');
  return `MR-${year}-${paddedNumber}`;
}

/**
 * Create a new Material Request
 * Auto-detects initial status based on creator's engineerRole:
 *   STAFF  → WAITING_WPO
 *   WPO    → WAITING_SYSTEM
 *   SYSTEM → WAITING_PM
 */
export async function createMaterialRequest(formData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    // Use manual input if provided, otherwise generate
    const manualDocNo = formData.get("docControlNo");
    const docControlNo = manualDocNo && manualDocNo.trim() !== ""
      ? manualDocNo
      : await generateDocControlNo();

    const projectId    = formData.get("projectId");
    const projectName  = formData.get("projectName");
    const assignSys    = formData.get("assignSys");
    const assignPM     = formData.get("assignPM");
    const workPackage  = formData.get("workPackage");
    const wpo          = formData.get("wpo");
    const keterangan   = formData.get("keterangan");
    const dateReleasedStr = formData.get("dateReleased");

    const items = JSON.parse(formData.get("items") || "[]");
    const file  = formData.get("file");

    let fileUrl = null;
    if (file && file.size > 0) {
      const bytes  = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = path.join(process.cwd(), "public", "uploads");

      try { await fs.access(uploadDir); }
      catch { await fs.mkdir(uploadDir, { recursive: true }); }

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
      fileUrl = `/uploads/${fileName}`;
    }

    // Auto-detect initial status based on engineer sub-role
    const initialStatus = getInitialApprovalStatus(session.user.engineerRole);

    const newMR = await prisma.materialRequest.create({
      data: {
        docControlNo,
        projectId,
        projectName,
        assignSys,
        assignPM,
        workPackage,
        wpo,
        keterangan,
        status: initialStatus,
        fileUrl,
        dateReleased: dateReleasedStr ? new Date(dateReleasedStr) : null,
        requestedBy: session.user.id.toString(),
        items: {
          create: items.map(item => ({
            description:         item.description,
            elsicomPartNum:      item.elsicomPartNum,
            manufacturePartNum:  item.manufacturePartNum,
            type:                item.type,
            manufacturer:        item.manufacturer,
            qty:                 parseInt(item.qty, 10) || 0,
            unit:                item.unit,
            targetDate:          item.targetDate ? new Date(item.targetDate) : null,
            remarks:             item.remarks,
          }))
        }
      }
    });

    revalidatePath("/engineer/material-request");
    return { success: true, data: newMR };
  } catch (error) {
    console.error("Error creating MR:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Material Requests — role-based filtering:
 *   STAFF  → own submissions
 *   WPO    → own submissions + WAITING_WPO queue
 *   SYSTEM → own submissions + WAITING_SYSTEM queue
 *   PM     → WAITING_PM queue + APPROVED
 */
export async function getMaterialRequests() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const { role, engineerRole, id } = session.user;

    let requests;

    if (role === "ENGINEER") {
      if (engineerRole === "STAFF") {
        // Only own submissions
        requests = await prisma.materialRequest.findMany({
          where: { requestedBy: id },
          orderBy: { createdAt: "desc" },
          include: { items: true, requester: true }
        });
      } else if (engineerRole === "WPO") {
        // Own + anything waiting for WPO
        requests = await prisma.materialRequest.findMany({
          where: {
            OR: [
              { requestedBy: id },
              { status: "WAITING_WPO" }
            ]
          },
          orderBy: { createdAt: "desc" },
          include: { items: true, requester: true }
        });
      } else if (engineerRole === "SYSTEM") {
        // Own + anything waiting for SYSTEM
        requests = await prisma.materialRequest.findMany({
          where: {
            OR: [
              { requestedBy: id },
              { status: "WAITING_SYSTEM" }
            ]
          },
          orderBy: { createdAt: "desc" },
          include: { items: true, requester: true }
        });
      } else {
        requests = await prisma.materialRequest.findMany({
          where: { requestedBy: id },
          orderBy: { createdAt: "desc" },
          include: { items: true, requester: true }
        });
      }
    } else if (role === "PROJECT_MANAGER") {
      requests = await prisma.materialRequest.findMany({
        where: { status: { in: ["WAITING_PM", "APPROVED", "REJECTED"] } },
        orderBy: { createdAt: "desc" },
        include: { items: true, requester: true, wpoApprover: true, systemApprover: true }
      });
    } else {
      // Procurement, Warehouse, etc. — see all
      requests = await prisma.materialRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: { items: true, requester: true }
      });
    }

    return { success: true, data: requests };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── Approval Level 1 — Engineer WPO ─────────────────────────────────────────

/**
 * Approve MR by Engineer WPO
 * WAITING_WPO → WAITING_SYSTEM
 */
export async function approveMRByWpo(mrId) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "WPO") {
      throw new Error("Unauthorized: Only Engineer WPO can perform this action.");
    }

    const mr = await prisma.materialRequest.findUnique({ where: { id: mrId } });
    if (!mr) throw new Error("Material Request tidak ditemukan.");
    if (mr.status !== "WAITING_WPO") {
      throw new Error(`Status tidak valid untuk WPO approval. Status saat ini: ${mr.status}`);
    }

    const updated = await prisma.materialRequest.update({
      where: { id: mrId },
      data: {
        status:          "WAITING_SYSTEM",
        wpoApprovedBy:   session.user.id,
        wpoApprovedAt:   new Date(),
      }
    });

    revalidatePath("/engineer/material-request");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error approving MR by WPO:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject MR by Engineer WPO
 */
export async function rejectMRByWpo(mrId, reason) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "WPO") {
      throw new Error("Unauthorized: Only Engineer WPO can perform this action.");
    }

    const mr = await prisma.materialRequest.findUnique({ where: { id: mrId } });
    if (!mr) throw new Error("Material Request tidak ditemukan.");
    if (mr.status !== "WAITING_WPO") {
      throw new Error("Status tidak valid untuk WPO rejection.");
    }

    const updated = await prisma.materialRequest.update({
      where: { id: mrId },
      data: {
        status:      "REJECTED",
        keterangan:  reason ? `DITOLAK WPO: ${reason}` : "DITOLAK WPO",
      }
    });

    revalidatePath("/engineer/material-request");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error rejecting MR by WPO:", error);
    return { success: false, error: error.message };
  }
}

// ─── Approval Level 2 — Engineer SYSTEM ──────────────────────────────────────

/**
 * Approve MR by Engineer SYSTEM
 * WAITING_SYSTEM → WAITING_PM
 */
export async function approveMRBySystem(mrId) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "SYSTEM") {
      throw new Error("Unauthorized: Only Engineer SYSTEM can perform this action.");
    }

    const mr = await prisma.materialRequest.findUnique({ where: { id: mrId } });
    if (!mr) throw new Error("Material Request tidak ditemukan.");
    if (mr.status !== "WAITING_SYSTEM") {
      throw new Error(`Status tidak valid untuk SYSTEM approval. Status saat ini: ${mr.status}`);
    }

    const updated = await prisma.materialRequest.update({
      where: { id: mrId },
      data: {
        status:            "WAITING_PM",
        systemApprovedBy:  session.user.id,
        systemApprovedAt:  new Date(),
      }
    });

    revalidatePath("/engineer/material-request");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error approving MR by SYSTEM:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject MR by Engineer SYSTEM
 */
export async function rejectMRBySystem(mrId, reason) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ENGINEER" || session.user.engineerRole !== "SYSTEM") {
      throw new Error("Unauthorized: Only Engineer SYSTEM can perform this action.");
    }

    const mr = await prisma.materialRequest.findUnique({ where: { id: mrId } });
    if (!mr) throw new Error("Material Request tidak ditemukan.");
    if (mr.status !== "WAITING_SYSTEM") {
      throw new Error("Status tidak valid untuk SYSTEM rejection.");
    }

    const updated = await prisma.materialRequest.update({
      where: { id: mrId },
      data: {
        status:     "REJECTED",
        keterangan: reason ? `DITOLAK SYSTEM: ${reason}` : "DITOLAK SYSTEM",
      }
    });

    revalidatePath("/engineer/material-request");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error rejecting MR by SYSTEM:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Pilihan isian untuk form Material Request.
 *
 * Sebelumnya daftar proyek di form ditulis mati sebagai PRJ-2413/PRJ-2414 dan
 * daftar PM sebagai "Agus PM", sehingga proyek yang benar-benar berjalan tidak
 * bisa dipilih. Selama belum ada tabel induk Project (lihat Tahap B di
 * APP_PLAN.md), daftar proyek disusun dari dokumen yang sudah ada.
 */
export async function getMrFormOptions() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const [bomProjects, mrProjects, systemEngineers, projectManagers] =
      await Promise.all([
        prisma.billOfMaterial.findMany({
          select: { projectId: true, projectName: true },
          distinct: ["projectId"],
        }),
        prisma.materialRequest.findMany({
          select: { projectId: true, projectName: true },
          distinct: ["projectId"],
        }),
        prisma.user.findMany({
          where: { role: "ENGINEER", engineerRole: "SYSTEM" },
          select: { name: true },
          orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
          where: { role: "PROJECT_MANAGER" },
          select: { name: true },
          orderBy: { name: "asc" },
        }),
      ]);

    // Gabungkan dua sumber, buang duplikat berdasarkan projectId.
    const byId = new Map();
    for (const p of [...bomProjects, ...mrProjects]) {
      if (p.projectId && !byId.has(p.projectId)) byId.set(p.projectId, p);
    }
    const projects = [...byId.values()].sort((a, b) =>
      a.projectId.localeCompare(b.projectId),
    );

    return {
      success: true,
      data: {
        projects,
        systemEngineers: systemEngineers.map((u) => u.name),
        projectManagers: projectManagers.map((u) => u.name),
      },
    };
  } catch (error) {
    console.error("Error loading MR form options:", error);
    return { success: false, error: error.message };
  }
}
