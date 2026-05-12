'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { revalidatePath } from 'next/cache'
import { createHistoryEntry } from '@/lib/bom-utils'

export async function getProcurementBom(bomId) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }
    if (session.user.role !== 'PROCUREMENT') return { success: false, error: 'Access denied' }

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
        histories: { orderBy: { timestamp: 'desc' }, take: 10 },
      },
    })

    if (!bom) return { success: false, error: 'BoM not found' }
    if (!['ACTIVE', 'PRICED'].includes(bom.bomStatus)) {
      return { success: false, error: 'BoM belum siap untuk pricing (status: ' + bom.bomStatus + ')' }
    }

    return { success: true, data: bom }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Save pricing for a direct-fill item (hasSubItems = false)
 */
export async function savePricing(bomId, itemId, pricing) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }
    if (session.user.role !== 'PROCUREMENT') return { success: false, error: 'Access denied' }

    const bom = await prisma.billOfMaterial.findUnique({ where: { id: bomId } })
    if (!bom || bom.bomStatus !== 'ACTIVE') {
      return { success: false, error: 'BoM tidak dalam status ACTIVE' }
    }

    const item = await prisma.bomItem.findUnique({ where: { id: itemId } })
    if (!item || item.bomId !== bomId) return { success: false, error: 'Item tidak ditemukan' }
    if (item.hasSubItems) return { success: false, error: 'Item ini menggunakan sub-items — harga diisi per sub-item' }

    const qty = item.refinedQty || 1
    const totalPrice = parseFloat(pricing.unitPrice) * qty

    const updated = await prisma.bomItem.update({
      where: { id: itemId },
      data: {
        unitPrice: parseFloat(pricing.unitPrice),
        totalPrice,
        currency: pricing.currency || 'IDR',
        supplier: pricing.supplier || null,
        leadTime: pricing.leadTime ? parseInt(pricing.leadTime) : null,
        itemStatus: 'PRICED',
        pricedBy: session.user.id,
        pricedAt: new Date(),
      },
    })

    revalidatePath(`/procurement/bom/${bomId}`)
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Save pricing for a sub-item (parent item has hasSubItems = true)
 */
export async function saveSubItemPricing(bomId, subItemId, pricing) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }
    if (session.user.role !== 'PROCUREMENT') return { success: false, error: 'Access denied' }

    const bom = await prisma.billOfMaterial.findUnique({ where: { id: bomId } })
    if (!bom || bom.bomStatus !== 'ACTIVE') {
      return { success: false, error: 'BoM tidak dalam status ACTIVE' }
    }

    const subItem = await prisma.bomSubItem.findUnique({
      where: { id: subItemId },
      include: { parentItem: { select: { bomId: true } } },
    })

    if (!subItem || subItem.parentItem.bomId !== bomId) {
      return { success: false, error: 'Sub-item tidak ditemukan' }
    }

    const totalPrice = parseFloat(pricing.unitPrice) * subItem.qty

    const updated = await prisma.bomSubItem.update({
      where: { id: subItemId },
      data: {
        unitPrice: parseFloat(pricing.unitPrice),
        totalPrice,
        currency: pricing.currency || 'IDR',
        supplier: pricing.supplier || null,
        leadTime: pricing.leadTime ? parseInt(pricing.leadTime) : null,
        pricedBy: session.user.id,
        pricedAt: new Date(),
      },
    })

    revalidatePath(`/procurement/bom/${bomId}`)
    return { success: true, data: updated }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Finalize all pricing — checks both direct items and sub-items
 */
export async function finalizePricing(bomId, notes) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }
    if (session.user.role !== 'PROCUREMENT') return { success: false, error: 'Access denied' }

    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: {
        items: {
          include: { subItems: true },
        },
      },
    })

    if (!bom || bom.bomStatus !== 'ACTIVE') {
      return { success: false, error: 'BoM tidak dalam status ACTIVE' }
    }

    // Check all items/sub-items are priced
    const unpriced = []
    for (const item of bom.items) {
      if (item.hasSubItems) {
        const unpricedSubs = item.subItems.filter((s) => !s.unitPrice)
        if (unpricedSubs.length > 0) {
          unpriced.push(`${unpricedSubs.length} sub-item dari "${item.marketingDesc}"`)
        }
      } else {
        if (!item.unitPrice) {
          unpriced.push(`"${item.marketingDesc}"`)
        }
      }
    }

    if (unpriced.length > 0) {
      return {
        success: false,
        error: `Item belum diisi harganya: ${unpriced.slice(0, 3).join(', ')}${unpriced.length > 3 ? ` (+${unpriced.length - 3} lainnya)` : ''}`,
      }
    }

    // Calculate total BoM value
    let totalBomValue = 0
    for (const item of bom.items) {
      if (item.hasSubItems) {
        totalBomValue += item.subItems.reduce((sum, s) => sum + (parseFloat(s.totalPrice) || 0), 0)
      } else {
        totalBomValue += parseFloat(item.totalPrice) || 0
      }
    }

    await prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        bomStatus: 'PRICED',
        pricedBy: session.user.id,
        pricedAt: new Date(),
        procurementNotes: notes || null,
      },
    })

    await prisma.bomHistory.create({
      data: createHistoryEntry(
        bomId,
        'PRICING_COMPLETE',
        session.user.id,
        `Pricing finalized oleh Procurement. Total nilai: IDR ${totalBomValue.toLocaleString('id-ID')}`,
      ),
    })

    revalidatePath('/procurement/bom')
    revalidatePath(`/procurement/bom/${bomId}`)
    return { success: true, message: 'Pricing finalized' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getProcurementStats() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Not authenticated' }

    const [active, priced] = await Promise.all([
      prisma.billOfMaterial.count({ where: { bomStatus: 'ACTIVE' } }),
      prisma.billOfMaterial.count({ where: { bomStatus: 'PRICED' } }),
    ])

    return { success: true, data: { active, priced } }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
