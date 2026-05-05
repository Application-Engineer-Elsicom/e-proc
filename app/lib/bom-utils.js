/**
 * BoM Utility Functions
 * Helper functions untuk BoM operations
 *
 * Usage:
 * - import { generateBomNo, calculateTotalPrice } from '@/lib/bom-utils'
 */

import { prisma } from "./prisma";

/**
 * Generate unique BoM number
 * Format: BOM-YYYY-XXXX (e.g., BOM-2026-0001)
 * @returns {Promise<string>} - New BoM number
 */
export async function generateBomNo() {
  const year = new Date().getFullYear();

  // Get latest BoM for this year
  const lastBom = await prisma.billOfMaterial.findFirst({
    where: {
      bomNo: {
        startsWith: `BOM-${year}-`,
      },
    },
    orderBy: {
      bomNo: "desc",
    },
  });

  // Extract sequence number
  let sequence = 1;
  if (lastBom) {
    const match = lastBom.bomNo.match(/BOM-\d+-(\d+)/);
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }

  // Format: BOM-2026-0001
  const bomNo = `BOM-${year}-${String(sequence).padStart(4, "0")}`;
  return bomNo;
}

/**
 * Calculate total price for BoM items
 * @param {Array} items - BomItem array with refinedQty & unitPrice
 * @returns {Decimal} - Total price sum
 */
export function calculateTotalPrice(items) {
  if (!items || items.length === 0) return 0;

  return items.reduce((sum, item) => {
    const itemTotal =
      (item.refinedQty || 0) * (item.unitPrice || 0);
    return sum + itemTotal;
  }, 0);
}

/**
 * Calculate total items count
 * @param {Array} items - BomItem array
 * @returns {number} - Total item count
 */
export function countTotalItems(items) {
  return items?.length || 0;
}

/**
 * Count refined items
 * @param {Array} items - BomItem array
 * @returns {number} - Count of REFINED status items
 */
export function countRefinedItems(items) {
  return items?.filter((item) => item.itemStatus === "REFINED").length || 0;
}

/**
 * Count priced items
 * @param {Array} items - BomItem array
 * @returns {number} - Count of PRICED status items
 */
export function countPricedItems(items) {
  return items?.filter((item) => item.itemStatus === "PRICED").length || 0;
}

/**
 * Check if all items are refined
 * @param {Array} items - BomItem array
 * @returns {boolean}
 */
export function isAllItemsRefined(items) {
  if (!items || items.length === 0) return false;
  return items.every((item) => item.itemStatus === "REFINED");
}

/**
 * Check if all items are priced
 * @param {Array} items - BomItem array
 * @returns {boolean}
 */
export function isAllItemsPriced(items) {
  if (!items || items.length === 0) return false;
  return items.every((item) => item.itemStatus === "PRICED");
}

/**
 * Check if all items have required refined data
 * @param {Array} items - BomItem array
 * @returns {boolean}
 */
export function isAllItemsHaveRefinedData(items) {
  if (!items || items.length === 0) return false;
  return items.every(
    (item) =>
      item.refinedDesc &&
      item.refinedQty &&
      item.refinedQty > 0,
  );
}

/**
 * Get BoM status label with styling
 * @param {string} status - BomStatus enum value
 * @returns {Object} - { label, color, bgColor }
 */
export function getBomStatusBadge(status) {
  const badges = {
    DRAFT: {
      label: "Draft",
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    SUBMITTED: {
      label: "Submitted",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    WPO_REVIEW: {
      label: "WPO Review",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    WPO_APPROVED: {
      label: "WPO Approved",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    WPO_REJECTED: {
      label: "WPO Rejected",
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    SYSTEM_REVIEW: {
      label: "System Review",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    SYSTEM_APPROVED: {
      label: "System Approved",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    SYSTEM_REJECTED: {
      label: "System Rejected",
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    REJECTED: {
      label: "Rejected",
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    ACTIVE: {
      label: "Active",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    ARCHIVED: {
      label: "Archived",
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
  };

  return badges[status] || badges.DRAFT;
}

/**
 * Get item status badge
 * @param {string} status - BomItemStatus enum value
 * @returns {Object} - { label, color, bgColor }
 */
export function getItemStatusBadge(status) {
  const badges = {
    PENDING: {
      label: "Pending",
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    REFINED: {
      label: "Refined",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    APPROVED: {
      label: "Approved",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    REJECTED: {
      label: "Rejected",
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    PRICED: {
      label: "Priced",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  };

  return badges[status] || badges.PENDING;
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date (e.g., "05 May 2026 10:30")
 */
export function formatBomDate(date) {
  if (!date) return "-";

  const d = new Date(date);
  const options = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };

  return d.toLocaleDateString("en-US", options);
}

/**
 * Format currency
 * @param {number} value - Value to format
 * @param {string} currency - Currency code (IDR, USD, EUR, etc)
 * @returns {string} - Formatted currency
 */
export function formatCurrency(value, currency = "IDR") {
  if (!value) return "0";

  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(value);
}

/**
 * Calculate approval percentage
 * @param {Object} bom - BillOfMaterial object
 * @returns {number} - Percentage (0-100)
 */
export function getApprovalPercentage(bom) {
  let completed = 0;
  const stages = 3; // WPO, System, Pricing (if applicable)

  if (bom.wpoApprovedAt) completed++;
  if (bom.systemApprovedAt) completed++;
  if (bom.bomStatus === "ACTIVE") completed++; // All priced

  return Math.round((completed / stages) * 100);
}

/**
 * Get next expected reviewer based on current status
 * @param {string} bomStatus - Current BOM status
 * @returns {string} - Role name of next reviewer
 */
export function getNextReviewerRole(bomStatus) {
  const nextReviewers = {
    DRAFT: "Marketing (Submit)",
    SUBMITTED: "Engineer Staff (Refine)",
    WPO_REVIEW: "Engineer WPO (Approve)",
    WPO_APPROVED: "Engineer System (Approve)",
    SYSTEM_APPROVED: "Procurement (Price)",
    SYSTEM_REVIEW: "Engineer System",
    WPO_REJECTED: "Engineer Staff (Re-work)",
  };

  return nextReviewers[bomStatus] || "Unknown";
}

/**
 * Check if BoM can transition to next status
 * @param {string} currentStatus - Current BOM status
 * @param {string} nextStatus - Target BOM status
 * @returns {boolean}
 */
export function isValidStatusTransition(currentStatus, nextStatus) {
  const validTransitions = {
    DRAFT: ["SUBMITTED"],
    SUBMITTED: ["WPO_REVIEW"],
    WPO_REVIEW: ["WPO_APPROVED", "WPO_REJECTED"],
    WPO_APPROVED: ["SYSTEM_REVIEW"],
    WPO_REJECTED: ["WPO_REVIEW"],
    SYSTEM_REVIEW: ["SYSTEM_APPROVED", "SYSTEM_REJECTED"],
    SYSTEM_APPROVED: ["ACTIVE"],
    SYSTEM_REJECTED: ["SYSTEM_REVIEW"],
    ACTIVE: ["ARCHIVED"],
  };

  return validTransitions[currentStatus]?.includes(nextStatus) || false;
}

/**
 * Calculate average lead time from items
 * @param {Array} items - BomItem array with leadTime
 * @returns {number} - Average in days
 */
export function calculateAverageLeadTime(items) {
  if (!items || items.length === 0) return 0;

  const withLeadTime = items.filter((item) => item.leadTime);
  if (withLeadTime.length === 0) return 0;

  const total = withLeadTime.reduce(
    (sum, item) => sum + item.leadTime,
    0,
  );
  return Math.ceil(total / withLeadTime.length);
}

/**
 * Get summary statistics for BoM
 * @param {Object} bom - BillOfMaterial with items array
 * @returns {Object} - Summary stats
 */
export function getBomSummary(bom) {
  const items = bom.items || [];

  return {
    totalItems: countTotalItems(items),
    refinedItems: countRefinedItems(items),
    pricedItems: countPricedItems(items),
    totalQty: items.reduce((sum, item) => sum + (item.refinedQty || 0), 0),
    totalCost: calculateTotalPrice(items),
    avgLeadTime: calculateAverageLeadTime(items),
    allRefined: isAllItemsRefined(items),
    allPriced: isAllItemsPriced(items),
  };
}

/**
 * Create history entry data
 * Useful for logging BOM changes
 * @param {string} bomId - BoM ID
 * @param {string} action - Action performed
 * @param {string} userId - User ID who performed action
 * @param {string} details - Details about action
 * @param {Object} previousData - Data before change (optional)
 * @param {Object} newData - Data after change (optional)
 * @returns {Object} - BomHistory entry data
 */
export function createHistoryEntry(
  bomId,
  action,
  userId,
  details,
  previousData = null,
  newData = null,
) {
  return {
    bomId,
    action,
    performedBy: userId,
    details,
    previousData: previousData
      ? JSON.stringify(previousData)
      : null,
    newData: newData ? JSON.stringify(newData) : null,
    timestamp: new Date(),
  };
}
