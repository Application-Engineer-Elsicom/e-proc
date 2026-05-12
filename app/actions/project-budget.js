"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

// ─── Upsert Project Budget ────────────────────────────────────────────────────

/**
 * Create or update project budget for a specific year
 */
export async function upsertProjectBudget(projectId, year, budget, currency = "IDR") {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can set project budgets.");
    }

    if (!projectId || !year || !budget) {
      throw new Error("projectId, year, and budget are required.");
    }

    const budgetValue = parseFloat(budget);
    const yearValue = parseInt(year);

    // Find existing budget
    const existing = await prisma.projectBudget.findUnique({
      where: {
        projectId_year: {
          projectId,
          year: yearValue,
        },
      },
    });

    let result;
    if (existing) {
      // Update existing
      result = await prisma.projectBudget.update({
        where: {
          projectId_year: {
            projectId,
            year: yearValue,
          },
        },
        data: {
          budget: budgetValue,
          currency,
        },
        include: {
          inputter: { select: { name: true, email: true } },
        },
      });
    } else {
      // Create new
      result = await prisma.projectBudget.create({
        data: {
          projectId,
          year: yearValue,
          budget: budgetValue,
          currency,
          inputBy: session.user.id.toString(),
        },
        include: {
          inputter: { select: { name: true, email: true } },
        },
      });
    }

    revalidatePath("/procurement");

    return { success: true, data: result };
  } catch (error) {
    console.error("Error upserting project budget:", error);
    return { success: false, error: error.message };
  }
}

// ─── Get Project Budgets ──────────────────────────────────────────────────────

/**
 * Fetch project budgets with optional filters
 */
export async function getProjectBudgets(filters = {}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view project budgets.");
    }

    const { projectId, year } = filters;

    const where = {};

    if (projectId) where.projectId = projectId;
    if (year) where.year = parseInt(year);

    const budgets = await prisma.projectBudget.findMany({
      where,
      include: {
        inputter: { select: { name: true, email: true } },
      },
      orderBy: [{ projectId: "asc" }, { year: "desc" }],
    });

    return { success: true, data: budgets };
  } catch (error) {
    console.error("Error fetching project budgets:", error);
    return { success: false, error: error.message };
  }
}

// ─── Get Budget for Single Project-Year ───────────────────────────────────────

/**
 * Get budget for a specific project and year
 */
export async function getProjectBudget(projectId, year) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view project budgets.");
    }

    const budget = await prisma.projectBudget.findUnique({
      where: {
        projectId_year: {
          projectId,
          year: parseInt(year),
        },
      },
      include: {
        inputter: { select: { name: true, email: true } },
      },
    });

    if (!budget) {
      return { success: false, error: "Budget not found" };
    }

    return { success: true, data: budget };
  } catch (error) {
    console.error("Error fetching project budget:", error);
    return { success: false, error: error.message };
  }
}

// ─── Get Budget Summary ───────────────────────────────────────────────────────

/**
 * Get budget summary for all projects in a year
 */
export async function getBudgetSummary(year) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PROCUREMENT") {
      throw new Error("Unauthorized: Only Procurement can view budget summary.");
    }

    const budgets = await prisma.projectBudget.findMany({
      where: {
        year: parseInt(year),
      },
      include: {
        inputter: { select: { name: true, email: true } },
      },
      orderBy: { projectId: "asc" },
    });

    // Calculate total budget
    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.budget), 0);

    return {
      success: true,
      data: {
        year: parseInt(year),
        budgets,
        totalBudget,
        count: budgets.length,
      },
    };
  } catch (error) {
    console.error("Error fetching budget summary:", error);
    return { success: false, error: error.message };
  }
}
