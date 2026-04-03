"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
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
 */
export async function createMaterialRequest(formData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    // NEW: Use manual input if provided, otherwise generate
    const manualDocNo = formData.get("docControlNo");
    const docControlNo = manualDocNo && manualDocNo.trim() !== "" 
      ? manualDocNo 
      : await generateDocControlNo();
    
    // Extracting data from FormData
    const projectId = formData.get("projectId");
    const projectName = formData.get("projectName");
    const assignSys = formData.get("assignSys"); // New
    const assignPM = formData.get("assignPM"); // New
    const workPackage = formData.get("workPackage");
    const wpo = formData.get("wpo");
    const keterangan = formData.get("keterangan");
    const dateReleasedStr = formData.get("dateReleased"); // New

    // Parsing items
    const items = JSON.parse(formData.get("items") || "[]");
    const file = formData.get("file");

    let fileUrl = null;
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      
      try { await fs.access(uploadDir); } 
      catch { await fs.mkdir(uploadDir, { recursive: true }); }

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
      fileUrl = `/uploads/${fileName}`;
    }

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
        status: "WAITING_WPO",
        fileUrl,
        dateReleased: dateReleasedStr ? new Date(dateReleasedStr) : null,
        requestedBy: session.user.id.toString(),
        items: {
          create: items.map(item => ({
            description: item.description,
            elsicomPartNum: item.elsicomPartNum,
            manufacturePartNum: item.manufacturePartNum,
            type: item.type, // New
            manufacturer: item.manufacturer, // New
            qty: parseInt(item.qty, 10) || 0,
            unit: item.unit,
            targetDate: item.targetDate ? new Date(item.targetDate) : null,
            remarks: item.remarks
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
 * Get all Material Requests
 */
export async function getMaterialRequests() {
  try {
    const requests = await prisma.materialRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true, requester: true }
    });
    return { success: true, data: requests };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
