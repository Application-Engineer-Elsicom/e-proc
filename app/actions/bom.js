'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { revalidatePath } from 'next/cache'
import { validateBomCreate } from '@/lib/zod-schemas'
import { generateBomNo, createHistoryEntry } from '@/lib/bom-utils'
import { canCreateBom } from '@/lib/permissions'

/**
 * Create new BoM (Marketing only)
 */
export async function createBom(formData) {
  try {
    const session = await getServerSession(authOptions)

    // Permission check
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!canCreateBom(session.user)) {
      return { success: false, error: 'Only marketing can create BoM' }
    }

    // Parse form data
    let bomData = {}
    formData.forEach((value, key) => {
      if (key === 'items') {
        bomData[key] = JSON.parse(value)
      } else {
        bomData[key] = value
      }
    })

    // Validate input
    const { data, error } = validateBomCreate({
      projectId: bomData.projectId,
      projectName: bomData.projectName,
      projectCode: bomData.projectCode,
      contractNo: bomData.contractNo || null,
      description: bomData.description || null,
      items: bomData.items || [],
    })

    if (error) {
      return { success: false, error }
    }

    // Generate unique BoM number
    const bomNo = await generateBomNo()

    // Create BoM with items
    const bom = await prisma.billOfMaterial.create({
      data: {
        bomNo,
        projectId: data.projectId,
        projectName: data.projectName,
        projectCode: data.projectCode,
        contractNo: data.contractNo,
        description: data.description,
        bomStatus: 'DRAFT',
        createdBy: session.user.id,
        items: {
          createMany: {
            data: data.items.map((item) => ({
              marketingDesc: item.marketingDesc,
              marketingQty: item.marketingQty ? parseInt(item.marketingQty) : null,
              marketingUnit: item.marketingUnit,
              itemStatus: 'PENDING',
            })),
          },
        },
      },
      include: { items: true },
    })

    // Create history entry
    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bom.id,
        'CREATED',
        session.user.id,
        `BoM created for project ${data.projectName}`,
        null,
        { bomNo: bom.bomNo, projectCode: bom.projectCode },
      ),
    })

    // Revalidate pages
    revalidatePath('/marketing/bom')

    return {
      success: true,
      bomId: bom.id,
      bomNo: bom.bomNo,
      message: `BoM ${bom.bomNo} created successfully`,
    }
  } catch (error) {
    console.error('Error creating BoM:', error)
    return {
      success: false,
      error: error.message || 'Failed to create BoM',
    }
  }
}

/**
 * Update BoM (DRAFT only)
 */
export async function updateBom(bomId, formData) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    // Fetch BoM
    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: { items: true },
    })

    if (!bom) {
      return { success: false, error: 'BoM not found' }
    }

    // Check permissions
    if (bom.createdBy !== session.user.id || bom.bomStatus !== 'DRAFT') {
      return { success: false, error: 'Only creator can edit draft BoM' }
    }

    // Parse form data
    let updateData = {}
    formData.forEach((value, key) => {
      if (key === 'items') {
        updateData[key] = JSON.parse(value)
      } else {
        updateData[key] = value
      }
    })

    // Update BoM
    const updated = await prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        projectName: updateData.projectName,
        projectCode: updateData.projectCode,
        contractNo: updateData.contractNo,
        description: updateData.description,
        updatedAt: new Date(),
      },
      include: { items: true },
    })

    // Create history
    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'UPDATED',
        session.user.id,
        'BoM updated',
      ),
    })

    revalidatePath('/marketing/bom')
    revalidatePath(`/marketing/bom/${bomId}`)

    return {
      success: true,
      message: 'BoM updated successfully',
    }
  } catch (error) {
    console.error('Error updating BoM:', error)
    return {
      success: false,
      error: error.message || 'Failed to update BoM',
    }
  }
}

/**
 * Delete BoM (DRAFT only)
 */
export async function deleteBom(bomId) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
    })

    if (!bom) {
      return { success: false, error: 'BoM not found' }
    }

    if (bom.createdBy !== session.user.id || bom.bomStatus !== 'DRAFT') {
      return { success: false, error: 'Only creator can delete draft BoM' }
    }

    // Delete (cascade will delete items and history)
    await prisma.billOfMaterial.delete({
      where: { id: bomId },
    })

    revalidatePath('/marketing/bom')

    return {
      success: true,
      message: 'BoM deleted successfully',
    }
  } catch (error) {
    console.error('Error deleting BoM:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete BoM',
    }
  }
}

/**
 * Submit BoM for refinement (DRAFT → SUBMITTED)
 */
export async function submitBomForRefinement(bomId) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
    })

    if (!bom) {
      return { success: false, error: 'BoM not found' }
    }

    if (bom.createdBy !== session.user.id || bom.bomStatus !== 'DRAFT') {
      return { success: false, error: 'Only creator can submit draft BoM' }
    }

    // Update status
    const updated = await prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        bomStatus: 'SUBMITTED',
        submittedBy: session.user.id,
        submittedAt: new Date(),
      },
    })

    // Create history
    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'SUBMITTED',
        session.user.id,
        'BoM submitted for engineer refinement',
        { status: 'DRAFT' },
        { status: 'SUBMITTED' },
      ),
    })

    revalidatePath('/marketing/bom')
    revalidatePath(`/marketing/bom/${bomId}`)

    return {
      success: true,
      message: 'BoM submitted for refinement',
    }
  } catch (error) {
    console.error('Error submitting BoM:', error)
    return {
      success: false,
      error: error.message || 'Failed to submit BoM',
    }
  }
}

/**
 * Archive BoM (ACTIVE → ARCHIVED)
 */
export async function archiveBom(bomId) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
    })

    if (!bom) {
      return { success: false, error: 'BoM not found' }
    }

    if (bom.createdBy !== session.user.id) {
      return { success: false, error: 'Only creator can archive BoM' }
    }

    if (bom.bomStatus !== 'ACTIVE') {
      return { success: false, error: 'Only active BoM can be archived' }
    }

    // Update status
    await prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        bomStatus: 'ARCHIVED',
      },
    })

    // Create history
    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'ARCHIVED',
        session.user.id,
        'BoM archived',
      ),
    })

    revalidatePath('/marketing/bom')

    return {
      success: true,
      message: 'BoM archived successfully',
    }
  } catch (error) {
    console.error('Error archiving BoM:', error)
    return {
      success: false,
      error: error.message || 'Failed to archive BoM',
    }
  }
}

/**
 * Get BoM detail (with permission check)
 */
export async function getBomDetail(bomId) {
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
        submitter: { select: { name: true } },
        wpoApprover: { select: { name: true } },
        systemApprover: { select: { name: true } },
        histories: { orderBy: { timestamp: 'desc' } },
      },
    })

    if (!bom) {
      return { success: false, error: 'BoM not found' }
    }

    // Check if user can view
    if (session.user.role === 'MARKETING' && bom.createdBy !== session.user.id) {
      return { success: false, error: 'Not authorized' }
    }

    return {
      success: true,
      data: bom,
    }
  } catch (error) {
    console.error('Error fetching BoM:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch BoM',
    }
  }
}

/**
 * Get BoMs for marketing user
 */
export async function getMarketingBoms(filters = {}) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    // Only marketing can fetch BoMs
    if (session.user.role !== 'MARKETING') {
      return { success: false, error: 'Only marketing can view BoM list' }
    }

    const { status = null, limit = 50, offset = 0 } = filters

    const where = {
      createdBy: session.user.id,
    }

    if (status) {
      where.bomStatus = status
    }

    const boms = await prisma.billOfMaterial.findMany({
      where,
      include: {
        items: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.billOfMaterial.count({ where })

    return {
      success: true,
      data: boms,
      total,
      limit,
      offset,
    }
  } catch (error) {
    console.error('Error fetching marketing BoMs:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch BoMs',
    }
  }
}
