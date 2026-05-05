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

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: {
        items: true,
        creator: { select: { name: true } },
        histories: { orderBy: { timestamp: 'desc' } },
      },
    })

    if (!bom) {
      return { success: false, error: 'BoM not found' }
    }

    return { success: true, data: bom }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function refineBomItem(bomId, itemId, refinement) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!canRefineBoM(session.user)) {
      return { success: false, error: 'Only STAFF engineers can refine items' }
    }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
    })

    if (!bom || bom.bomStatus !== 'SUBMITTED') {
      return { success: false, error: 'BoM not in refinement stage' }
    }

    const updated = await prisma.bomItem.update({
      where: { id: itemId },
      data: {
        refinedQty: refinement.refinedQty ? parseInt(refinement.refinedQty) : null,
        specifications: refinement.specifications || null,
        notes: refinement.notes || null,
        itemStatus: 'REFINED',
        refinedBy: session.user.id,
        refinedAt: new Date(),
      },
    })

    revalidatePath(`/engineer/bom/${bomId}/refine`)

    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function submitBomForApproval(bomId) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!canRefineBoM(session.user)) {
      return { success: false, error: 'Only STAFF engineers can submit' }
    }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: { items: true },
    })

    if (!bom || bom.bomStatus !== 'SUBMITTED') {
      return { success: false, error: 'BoM not in refinement stage' }
    }

    const refinedItems = bom.items.filter((i) => i.itemStatus === 'REFINED').length
    if (refinedItems === 0) {
      return { success: false, error: 'At least one item must be refined' }
    }

    const updated = await prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        bomStatus: 'WPO_REVIEW',
        updatedAt: new Date(),
      },
    })

    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'REFINEMENT_COMPLETE',
        session.user.id,
        `${refinedItems} items refined and submitted for WPO approval`,
      ),
    })

    revalidatePath('/engineer/bom')
    revalidatePath(`/engineer/bom/${bomId}/refine`)

    return { success: true, message: 'BoM submitted for WPO approval' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function approveBomByWpo(bomId) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!canApproveWPO(session.user)) {
      return { success: false, error: 'Only WPO engineers can approve' }
    }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
    })

    if (!bom || bom.bomStatus !== 'WPO_REVIEW') {
      return { success: false, error: 'BoM not in WPO review stage' }
    }

    const updated = await prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        bomStatus: 'SYSTEM_REVIEW',
        wpoApprovedBy: session.user.id,
        wpoApprovedAt: new Date(),
      },
    })

    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'WPO_APPROVED',
        session.user.id,
        'Approved by WPO - moving to system review',
      ),
    })

    revalidatePath('/engineer/bom')

    return { success: true, message: 'BoM approved by WPO' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function approveBomBySystem(bomId) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!canApproveSystem(session.user)) {
      return { success: false, error: 'Only SYSTEM engineers can activate' }
    }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
    })

    if (!bom || bom.bomStatus !== 'SYSTEM_REVIEW') {
      return { success: false, error: 'BoM not in system review stage' }
    }

    const updated = await prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        bomStatus: 'ACTIVE',
        systemApprovedBy: session.user.id,
        systemApprovedAt: new Date(),
      },
    })

    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'SYSTEM_APPROVED',
        session.user.id,
        'Approved and activated by SYSTEM - ready for procurement',
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

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const item = await prisma.bomItem.update({
      where: { id: itemId },
      data: {
        itemStatus: 'REJECTED',
      },
    })

    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'ITEM_REJECTED',
        session.user.id,
        `Item rejected: ${reason}`,
      ),
    })

    revalidatePath(`/engineer/bom/${bomId}/refine`)

    return { success: true, data: item }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
