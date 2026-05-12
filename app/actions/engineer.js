'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { revalidatePath } from 'next/cache'
import { canRefineBoM, canApproveWPO, canApproveSystem } from '@/lib/permissions'
import { createHistoryEntry } from '@/lib/bom-utils'

export async function getBomForRefinement(bomId) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            subItems: { orderBy: { sortOrder: 'asc' } },
          },
        },
        creator: { select: { name: true } },
        histories: { orderBy: { timestamp: 'desc' } },
      },
    })

    if (!bom) return { success: false, error: 'BoM not found' }
    return { success: true, data: bom }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Direct-fill mode: engineer fills qty + unit + specs on the item itself
 */
export async function refineBomItem(bomId, itemId, refinement) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }
    if (!canRefineBoM(session.user)) return { success: false, error: 'Only STAFF engineers can refine items' }

    const bom = await prisma.billOfMaterial.findUnique({ where: { id: bomId } })
    if (!bom || bom.bomStatus !== 'SUBMITTED') {
      return { success: false, error: 'BoM tidak dalam status refinement' }
    }

    if (!refinement.refinedQty || parseInt(refinement.refinedQty) < 1) {
      return { success: false, error: 'Qty harus diisi (minimal 1)' }
    }

    // Delete any existing sub-items if switching to direct fill
    await prisma.bomSubItem.deleteMany({ where: { bomItemId: itemId } })

    const updated = await prisma.bomItem.update({
      where: { id: itemId },
      data: {
        hasSubItems: false,
        refinedQty: parseInt(refinement.refinedQty),
        refinedUnit: refinement.refinedUnit || 'Pcs',
        specifications: refinement.specifications || null,
        notes: refinement.notes || null,
        itemStatus: 'REFINED',
        refinedBy: session.user.id,
        refinedAtStaff: new Date(),
      },
      include: { subItems: true },
    })

    revalidatePath(`/engineer/bom/${bomId}/refine`)
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Sub-items mode: engineer breaks the marketing item into sub-items (each with qty)
 */
export async function saveBomSubItems(bomId, itemId, subItems) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }
    if (!canRefineBoM(session.user)) return { success: false, error: 'Only STAFF engineers can refine items' }

    const bom = await prisma.billOfMaterial.findUnique({ where: { id: bomId } })
    if (!bom || bom.bomStatus !== 'SUBMITTED') {
      return { success: false, error: 'BoM tidak dalam status refinement' }
    }

    if (!subItems || subItems.length === 0) {
      return { success: false, error: 'Minimal 1 sub-item harus ada' }
    }

    // Validate each sub-item
    for (const si of subItems) {
      if (!si.description?.trim()) return { success: false, error: 'Deskripsi sub-item tidak boleh kosong' }
      if (!si.qty || parseInt(si.qty) < 1) return { success: false, error: 'Qty sub-item harus diisi' }
      if (!si.unit?.trim()) return { success: false, error: 'Unit sub-item tidak boleh kosong' }
    }

    // Replace all sub-items for this item
    await prisma.bomSubItem.deleteMany({ where: { bomItemId: itemId } })

    await prisma.bomSubItem.createMany({
      data: subItems.map((si, idx) => ({
        bomItemId: itemId,
        description: si.description.trim(),
        qty: parseInt(si.qty),
        unit: si.unit.trim(),
        specifications: si.specifications?.trim() || null,
        notes: si.notes?.trim() || null,
        sortOrder: idx,
      })),
    })

    // Update parent item — clear direct-fill fields, mark as REFINED
    const updated = await prisma.bomItem.update({
      where: { id: itemId },
      data: {
        hasSubItems: true,
        refinedQty: null,
        refinedUnit: null,
        specifications: null,
        notes: null,
        itemStatus: 'REFINED',
        refinedBy: session.user.id,
        refinedAtStaff: new Date(),
      },
      include: { subItems: { orderBy: { sortOrder: 'asc' } } },
    })

    revalidatePath(`/engineer/bom/${bomId}/refine`)
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function submitBomForApproval(bomId, assignedToWpoId = null) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }
    if (!canRefineBoM(session.user)) return { success: false, error: 'Only STAFF engineers can submit' }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: { items: true },
    })

    if (!bom || bom.bomStatus !== 'SUBMITTED') {
      return { success: false, error: 'BoM tidak dalam status refinement' }
    }

    const unrefinedItems = bom.items.filter((i) => i.itemStatus !== 'REFINED')
    if (unrefinedItems.length > 0) {
      return {
        success: false,
        error: `${unrefinedItems.length} item belum di-refine. Semua item harus diselesaikan terlebih dahulu.`,
      }
    }

    // Validate assigned WPO if provided
    if (assignedToWpoId) {
      const wpoUser = await prisma.user.findUnique({ where: { id: assignedToWpoId } })
      if (!wpoUser || wpoUser.role !== 'ENGINEER' || wpoUser.engineerRole !== 'WPO') {
        return { success: false, error: 'Invalid WPO engineer selected' }
      }
    }

    await prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        bomStatus: 'WPO_REVIEW',
        assignedToWpo: assignedToWpoId || null,
        updatedAt: new Date()
      },
    })

    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'REFINEMENT_COMPLETE',
        session.user.id,
        `${bom.items.length} items refined dan submitted untuk WPO approval${assignedToWpoId ? ` - assigned to WPO` : ''}`,
      ),
    })

    revalidatePath('/engineer/bom')
    revalidatePath(`/engineer/bom/${bomId}/refine`)
    return { success: true, message: 'BoM submitted for WPO approval' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function approveBomByWpo(bomId, rejectionReasons = {}, comments = '', assignedToSystemId = null) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }
    if (!canApproveWPO(session.user)) return { success: false, error: 'Only WPO engineers can approve' }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: { items: true },
    })

    if (!bom || bom.bomStatus !== 'WPO_REVIEW') {
      return { success: false, error: 'BoM not in WPO review stage' }
    }

    // Validate assigned SYSTEM engineer if provided
    if (assignedToSystemId) {
      const systemUser = await prisma.user.findUnique({ where: { id: assignedToSystemId } })
      if (!systemUser || systemUser.role !== 'ENGINEER' || systemUser.engineerRole !== 'SYSTEM') {
        return { success: false, error: 'Invalid SYSTEM engineer selected' }
      }
    }

    for (const [itemId, reason] of Object.entries(rejectionReasons)) {
      if (reason.trim()) {
        await prisma.bomItem.update({
          where: { id: itemId },
          data: {
            itemStatus: 'REJECTED',
            rejectionReason: reason,
            refinedAtWpo: new Date(),
            refinedByWpo: session.user.id,
          },
        })
      }
    }

    await prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        bomStatus: 'SYSTEM_REVIEW',
        wpoApprovedBy: session.user.id,
        wpoApprovedAt: new Date(),
        wpoRemarks: comments || null,
        assignedToSystem: assignedToSystemId || null,
      },
    })

    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'WPO_APPROVED',
        session.user.id,
        `Approved by WPO - moving to system review${comments ? ` (Remarks: ${comments})` : ''}${assignedToSystemId ? ' - assigned to SYSTEM' : ''}`,
      ),
    })

    revalidatePath('/engineer/bom')
    return { success: true, message: 'BoM approved by WPO' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function approveBomBySystem(bomId, comments = '') {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }
    if (!canApproveSystem(session.user)) return { success: false, error: 'Only SYSTEM engineers can activate' }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: { items: true },
    })

    if (!bom || bom.bomStatus !== 'SYSTEM_REVIEW') {
      return { success: false, error: 'BoM not in system review stage' }
    }

    await prisma.bomItem.updateMany({
      where: { bomId },
      data: {
        itemStatus: 'APPROVED',
        refinedBySystem: session.user.id,
        refinedAtSystem: new Date(),
      },
    })

    await prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        bomStatus: 'ACTIVE',
        systemApprovedBy: session.user.id,
        systemApprovedAt: new Date(),
        systemRemarks: comments || null,
      },
    })

    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'SYSTEM_APPROVED',
        session.user.id,
        `Approved and activated by SYSTEM - ready for procurement${comments ? ` (Remarks: ${comments})` : ''}`,
      ),
    })

    revalidatePath('/engineer/bom')
    return { success: true, message: 'BoM activated and ready for procurement' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function rejectBomItem(bomId, itemId, reason) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }

    if (!itemId) {
      if (!canRefineBoM(session.user)) return { success: false, error: 'Only STAFF engineers can reject BoM' }

      await prisma.billOfMaterial.update({
        where: { id: bomId },
        data: { bomStatus: 'REJECTED', updatedAt: new Date() },
      })

      await prisma.bomHistory.create({
        data: createHistoryEntry(
          bomId,
          'BOM_REJECTED',
          session.user.id,
          `BoM rejected and sent back to Marketing: ${reason}`,
        ),
      })

      revalidatePath('/engineer/bom')
      return { success: true, message: 'BoM rejected and sent back to Marketing' }
    }

    const item = await prisma.bomItem.update({
      where: { id: itemId },
      data: { itemStatus: 'REJECTED', rejectionReason: reason },
    })

    await prisma.bomHistory.create({
      data: createHistoryEntry(bomId, 'ITEM_REJECTED', session.user.id, `Item rejected: ${reason}`),
    })

    revalidatePath(`/engineer/bom/${bomId}/refine`)
    return { success: true, data: item }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Get list of all ENGINEER users with engineerRole = WPO for assignment
 */
export async function getEngineerWpoList() {
  try {
    const wpoEngineers = await prisma.user.findMany({
      where: {
        role: 'ENGINEER',
        engineerRole: 'WPO',
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
      orderBy: { name: 'asc' },
    })

    return { success: true, data: wpoEngineers }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Get list of all ENGINEER users with engineerRole = SYSTEM for assignment
 */
export async function getEngineerSystemList() {
  try {
    const systemEngineers = await prisma.user.findMany({
      where: {
        role: 'ENGINEER',
        engineerRole: 'SYSTEM',
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
      orderBy: { name: 'asc' },
    })

    return { success: true, data: systemEngineers }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * WPO edit capability: Allow WPO engineer to modify refined items before approval
 * Can switch between direct-fill and sub-items modes
 */
export async function editRefinedItemByWpo(bomId, itemId, editedData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }
    if (!canApproveWPO(session.user)) return { success: false, error: 'Only WPO engineers can edit' }

    const bom = await prisma.billOfMaterial.findUnique({ where: { id: bomId } })
    if (!bom || bom.bomStatus !== 'WPO_REVIEW') {
      return { success: false, error: 'BoM not in WPO review stage' }
    }

    const item = await prisma.bomItem.findUnique({
      where: { id: itemId },
      include: { subItems: true },
    })

    if (!item || item.bomId !== bomId) {
      return { success: false, error: 'Item not found' }
    }

    if (!item.itemStatus || item.itemStatus !== 'REFINED') {
      return { success: false, error: 'Item is not in REFINED status' }
    }

    // Determine new mode based on editedData content
    // If subItems array is provided, switch to sub-items mode
    // If refinedQty is provided, switch to direct-fill mode
    const isNewDirectFill = editedData.subItems === undefined || !Array.isArray(editedData.subItems)

    if (isNewDirectFill) {
      // Direct fill mode: validate and update qty, unit, specs, notes
      if (!editedData.refinedQty || parseInt(editedData.refinedQty) < 1) {
        return { success: false, error: 'Qty harus diisi (minimal 1)' }
      }

      // If switching from sub-items to direct, delete old sub-items
      if (item.hasSubItems) {
        await prisma.bomSubItem.deleteMany({ where: { bomItemId: itemId } })
      }

      const updated = await prisma.bomItem.update({
        where: { id: itemId },
        data: {
          hasSubItems: false,
          refinedQty: parseInt(editedData.refinedQty),
          refinedUnit: editedData.refinedUnit || 'Pcs',
          specifications: editedData.specifications || null,
          notes: editedData.notes || null,
        },
      })

      revalidatePath(`/engineer/bom/${bomId}`)
      return { success: true, data: updated, message: 'Item edited by WPO (Direct fill)' }
    } else {
      // Sub-items mode: create/replace sub-items
      if (!editedData.subItems || editedData.subItems.length === 0) {
        return { success: false, error: 'Minimal 1 sub-item harus ada' }
      }

      // Validate each sub-item
      for (const si of editedData.subItems) {
        if (!si.description?.trim()) return { success: false, error: 'Deskripsi sub-item tidak boleh kosong' }
        if (!si.qty || parseInt(si.qty) < 1) return { success: false, error: 'Qty sub-item harus diisi' }
        if (!si.unit?.trim()) return { success: false, error: 'Unit sub-item tidak boleh kosong' }
      }

      // Replace all sub-items
      await prisma.bomSubItem.deleteMany({ where: { bomItemId: itemId } })

      await prisma.bomSubItem.createMany({
        data: editedData.subItems.map((si, idx) => ({
          bomItemId: itemId,
          description: si.description.trim(),
          qty: parseInt(si.qty),
          unit: si.unit.trim(),
          specifications: si.specifications?.trim() || null,
          notes: si.notes?.trim() || null,
          sortOrder: idx,
        })),
      })

      // Update parent item to mark as sub-items mode
      const updated = await prisma.bomItem.update({
        where: { id: itemId },
        data: {
          hasSubItems: true,
          refinedQty: null,
          refinedUnit: null,
        },
        include: { subItems: { orderBy: { sortOrder: 'asc' } } },
      })

      revalidatePath(`/engineer/bom/${bomId}`)
      return { success: true, data: updated, message: 'Item edited by WPO (Sub-items)' }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
