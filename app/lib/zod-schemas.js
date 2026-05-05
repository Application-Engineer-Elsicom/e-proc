/**
 * Zod Schemas untuk BoM Form Validation
 * Digunakan di client (React Hook Form) dan server (Server Actions)
 *
 * Usage:
 * - import { BomCreateSchema } from '@/lib/zod-schemas'
 * - const result = BomCreateSchema.safeParse(data)
 */

import { z } from "zod";

// ========== Enums ==========

export const BomStatusEnum = z.enum([
  "DRAFT",
  "SUBMITTED",
  "WPO_REVIEW",
  "WPO_APPROVED",
  "WPO_REJECTED",
  "SYSTEM_REVIEW",
  "SYSTEM_APPROVED",
  "SYSTEM_REJECTED",
  "REJECTED",
  "ACTIVE",
  "ARCHIVED",
]);

export const BomItemStatusEnum = z.enum([
  "PENDING",
  "REFINED",
  "APPROVED",
  "REJECTED",
  "PRICED",
]);

export const CurrencyEnum = z.enum(["IDR", "USD", "EUR", "SGD"]);

// ========== Schemas untuk Marketing ==========

/**
 * Schema untuk create BoM (Marketing)
 */
export const BomCreateSchema = z.object({
  projectId: z
    .string()
    .min(1, "Project ID required")
    .max(50, "Project ID too long"),
  projectName: z
    .string()
    .min(3, "Project name min 3 characters")
    .max(255, "Project name max 255 characters"),
  projectCode: z
    .string()
    .min(1, "Project code required")
    .max(50, "Project code too long"),
  contractNo: z.string().max(100, "Contract no too long").optional(),
  description: z
    .string()
    .max(1000, "Description max 1000 characters")
    .optional(),
  items: z
    .array(
      z.object({
        marketingDesc: z
          .string()
          .min(1, "Item description required")
          .max(500, "Description too long"),
        marketingQty: z
          .number()
          .optional()
          .nullable(),
        marketingUnit: z
          .string()
          .max(50, "Unit too long")
          .optional(),
      }),
    )
    .min(1, "Minimal 1 item harus ada"),
});

/**
 * Schema untuk update BoM (Marketing - draft only)
 */
export const BomUpdateSchema = BomCreateSchema.partial();

// ========== Schemas untuk Engineer Staff ==========

/**
 * Schema untuk refine BoM item (Engineer Staff)
 */
export const BomItemRefineSchema = z.object({
  refinedDesc: z
    .string()
    .min(1, "Description required")
    .max(500, "Description too long"),
  refinedQty: z
    .number()
    .int("Quantity must be integer")
    .positive("Quantity must be > 0"),
  refinedUnit: z
    .string()
    .min(1, "Unit required")
    .max(50, "Unit too long"),
  notes: z
    .string()
    .max(500, "Notes max 500 characters")
    .optional(),
});

/**
 * Schema untuk submit BoM untuk approval
 */
export const BomSubmitApprovalSchema = z.object({
  bomId: z.string().cuid("Invalid BoM ID"),
});

// ========== Schemas untuk Engineer Approval ==========

/**
 * Schema untuk approve BoM (WPO atau System)
 */
export const BomApprovalSchema = z.object({
  bomId: z.string().cuid("Invalid BoM ID"),
  remarks: z
    .string()
    .max(500, "Remarks max 500 characters")
    .optional(),
});

/**
 * Schema untuk reject BoM (WPO atau System)
 */
export const BomRejectSchema = z.object({
  bomId: z.string().cuid("Invalid BoM ID"),
  rejectionReason: z
    .string()
    .min(1, "Rejection reason required")
    .max(500, "Reason too long"),
});

// ========== Schemas untuk Procurement ==========

/**
 * Schema untuk add/update pricing pada BoM item
 */
export const BomItemPricingSchema = z.object({
  itemId: z.string().cuid("Invalid item ID"),
  unitPrice: z
    .number()
    .positive("Unit price must be > 0"),
  currency: CurrencyEnum.default("IDR"),
  supplier: z
    .string()
    .min(1, "Supplier required")
    .max(255, "Supplier too long"),
  leadTime: z
    .number()
    .int("Lead time must be integer")
    .positive("Lead time must be > 0")
    .optional(),
});

/**
 * Schema untuk batch update pricing
 */
export const BomBatchPricingSchema = z.object({
  bomId: z.string().cuid("Invalid BoM ID"),
  prices: z.array(BomItemPricingSchema).min(1, "Minimal 1 item harus di-price"),
});

// ========== Helper Schemas ==========

/**
 * Schema untuk filter/search BoM
 */
export const BomFilterSchema = z.object({
  status: BomStatusEnum.optional(),
  projectCode: z.string().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

/**
 * Validate dan parse dengan error messages bahasa Indonesia
 * Gunakan untuk server-side validation di Server Actions
 *
 * Usage:
 * const { data, error } = validateBomCreate(formData)
 * if (error) throw new Error(error)
 */

export function validateBomCreate(data) {
  const result = BomCreateSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("; ");
    return { data: null, error: errors };
  }

  return { data: result.data, error: null };
}

export function validateBomItemRefine(data) {
  const result = BomItemRefineSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("; ");
    return { data: null, error: errors };
  }

  return { data: result.data, error: null };
}

export function validateBomApproval(data) {
  const result = BomApprovalSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("; ");
    return { data: null, error: errors };
  }

  return { data: result.data, error: null };
}

export function validateBomReject(data) {
  const result = BomRejectSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("; ");
    return { data: null, error: errors };
  }

  return { data: result.data, error: null };
}

export function validateBomItemPricing(data) {
  const result = BomItemPricingSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("; ");
    return { data: null, error: errors };
  }

  return { data: result.data, error: null };
}

export function validateBomBatchPricing(data) {
  const result = BomBatchPricingSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("; ");
    return { data: null, error: errors };
  }

  return { data: result.data, error: null };
}
