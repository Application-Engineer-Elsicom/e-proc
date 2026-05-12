"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

/**
 * Get dashboard statistics: engineer requests not processed
 */
export async function getDashboardStats(filters = {}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view dashboard stats.");
    }

    // Count MRs approved by PM but not yet in procurement
    const mrNotProcessed = await prisma.materialRequest.count({
      where: {
        status: "APPROVED",
      },
    });

    // Count WRs approved by PM but not yet processed
    const wrNotProcessed = await prisma.warehouseRelease.count({
      where: {
        status: "APPROVED",
      },
    });

    // Count FRs approved by PM but not yet processed
    const frNotProcessed = await prisma.faultReport.count({
      where: {
        approvalStatus: "APPROVED",
      },
    });

    // Count released POs
    const poReleased = await prisma.purchaseOrder.count({
      where: {
        status: "RELEASED",
      },
    });

    // Count pending POs (not all items received)
    const pos = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ["RELEASED", "PARTIAL_RECEIVED"] },
      },
      include: {
        items: true,
      },
    });

    const poPending = pos.filter(po => !po.items.every(item => item.matIn)).length;

    // Count late POs
    const allPos = await prisma.purchaseOrder.findMany({
      include: { items: true },
    });

    const today = new Date();
    const poLate = allPos.filter(po => {
      const daysUntilDelivery = Math.ceil((po.deliveryTime - today) / (1000 * 60 * 60 * 24));
      const allReceived = po.items.every(item => item.matIn);
      return daysUntilDelivery < 0 && !allReceived;
    }).length;

    return {
      success: true,
      data: {
        mrNotProcessed,
        wrNotProcessed,
        frNotProcessed,
        poReleased,
        poPending,
        poLate,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { success: false, error: error.message };
  }
}

// ─── Financial Stats ────────────────────────────────────────────────────────

/**
 * Get financial statistics: budget vs spending per project
 */
export async function getFinancialStats(year, projectId) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view financial stats.");
    }

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    // Get budgets
    const budgets = await prisma.projectBudget.findMany({
      where: {
        year,
        ...(projectId && { projectId }),
      },
    });

    // Get total spending per project from POs in that year
    const pos = await prisma.purchaseOrder.findMany({
      where: {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
        ...(projectId && { projectId }),
      },
    });

    // Group spending by project
    const spendingByProject = {};
    pos.forEach(po => {
      if (!spendingByProject[po.projectCode]) {
        spendingByProject[po.projectCode] = 0;
      }
      spendingByProject[po.projectCode] += parseFloat(po.totalAmount || 0);
    });

    // Combine budget and spending
    const financialData = budgets.map(budget => ({
      projectId: budget.projectId,
      budget: parseFloat(budget.budget),
      spending: spendingByProject[budget.projectId] || 0,
      currency: budget.currency,
    }));

    // Calculate totals
    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.budget), 0);
    const totalSpending = Object.values(spendingByProject).reduce((sum, s) => sum + s, 0);

    return {
      success: true,
      data: {
        financialData,
        totalBudget,
        totalSpending,
        year,
      },
    };
  } catch (error) {
    console.error("Error fetching financial stats:", error);
    return { success: false, error: error.message };
  }
}

// ─── Orders Requiring Attention ──────────────────────────────────────────────

/**
 * Get POs that need attention: Warning, Critical, Late
 */
export async function getOrdersRequiringAttention() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view orders.");
    }

    const pos = await prisma.purchaseOrder.findMany({
      include: {
        items: true,
        creator: { select: { name: true } },
      },
      orderBy: { deliveryTime: "asc" },
    });

    const today = new Date();

    // Categorize POs
    const categorized = {
      warning: [],
      critical: [],
      late: [],
    };

    pos.forEach(po => {
      const daysUntilDelivery = Math.ceil((po.deliveryTime - today) / (1000 * 60 * 60 * 24));
      const allReceived = po.items.every(item => item.matIn);

      if (allReceived) return; // Skip fully received POs

      let health;
      if (daysUntilDelivery > 14) health = "on_track";
      else if (daysUntilDelivery > 7) health = "warning";
      else if (daysUntilDelivery >= 0) health = "critical";
      else health = "late";

      const poData = {
        id: po.id,
        poNumber: po.poNumber,
        projectId: po.projectId,
        projectCode: po.projectCode,
        supplierName: po.supplierName,
        poDate: po.poDate,
        deliveryTime: po.deliveryTime,
        daysUntilDelivery,
        health,
      };

      if (health === "warning") categorized.warning.push(poData);
      else if (health === "critical") categorized.critical.push(poData);
      else if (health === "late") categorized.late.push(poData);
    });

    return {
      success: true,
      data: {
        warning: categorized.warning,
        critical: categorized.critical,
        late: categorized.late,
        counts: {
          warning: categorized.warning.length,
          critical: categorized.critical.length,
          late: categorized.late.length,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching orders requiring attention:", error);
    return { success: false, error: error.message };
  }
}

// ─── Project Summary ────────────────────────────────────────────────────────

/**
 * Get PO summary per project
 */
export async function getProjectSummary() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view project summary.");
    }

    const pos = await prisma.purchaseOrder.findMany({
      include: {
        items: true,
      },
    });

    // Group by project
    const projectSummary = {};

    pos.forEach(po => {
      const key = po.projectCode || po.projectId;
      if (!projectSummary[key]) {
        projectSummary[key] = {
          projectId: po.projectId,
          projectCode: po.projectCode,
          totalPO: 0,
          fullReceived: 0,
        };
      }

      projectSummary[key].totalPO += 1;

      // Check if this PO is fully received
      if (po.items.every(item => item.matIn)) {
        projectSummary[key].fullReceived += 1;
      }
    });

    const data = Object.values(projectSummary).sort((a, b) =>
      (a.projectCode || a.projectId).localeCompare(b.projectCode || b.projectId)
    );

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching project summary:", error);
    return { success: false, error: error.message };
  }
}
