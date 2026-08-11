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
// Field opsional pakai .nullish(): kolom DB-nya nullable, jadi server action
// mengirim null untuk isian kosong. .optional() saja hanya menerima undefined
// dan membuat field "(Opsional)" jadi wajib diisi.
export const BomCreateSchema = z.object({
  projectId: z
    .string()
    .min(1, "Project ID wajib diisi")
    .max(50, "Project ID maksimal 50 karakter"),
  projectName: z
    .string()
    .min(3, "Nama proyek minimal 3 karakter")
    .max(255, "Nama proyek maksimal 255 karakter"),
  projectCode: z
    .string()
    .min(1, "Project Code wajib diisi")
    .max(50, "Project Code maksimal 50 karakter"),
  contractNo: z.string().max(100, "Contract No maksimal 100 karakter").nullish(),
  description: z
    .string()
    .max(1000, "Deskripsi maksimal 1000 karakter")
    .nullish(),
  items: z
    .array(
      z.object({
        marketingDesc: z
          .string()
          .min(1, "Deskripsi item wajib diisi")
          .max(500, "Deskripsi item maksimal 500 karakter"),
        marketingQty: z.number().nullish(),
        marketingUnit: z.string().max(50, "Satuan maksimal 50 karakter").nullish(),
      }),
    )
    .min(1, "Minimal 1 item harus diisi"),
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

/**
 * Susun pesan error yang bisa dibaca pengguna.
 * Sebelumnya tiap validator mencetak `path: message` mentah dari Zod
 * (mis. "description: Expected string, received null") yang tidak berarti
 * apa-apa bagi pengguna. Baris item diberi nomor supaya jelas mana yang salah.
 */
function formatIssues(issues) {
  return issues
    .map((err) => {
      const [head, index] = err.path;
      const isItemRow = head === "items" && Number.isInteger(index);
      return isItemRow ? `Item ${index + 1}: ${err.message}` : err.message;
    })
    .join("; ");
}

function runValidation(schema, data) {
  const result = schema.safeParse(data);
  return result.success
    ? { data: result.data, error: null }
    : { data: null, error: formatIssues(result.error.errors) };
}

export const validateBomCreate = (data) => runValidation(BomCreateSchema, data);
export const validateBomItemRefine = (data) => runValidation(BomItemRefineSchema, data);
export const validateBomApproval = (data) => runValidation(BomApprovalSchema, data);
export const validateBomReject = (data) => runValidation(BomRejectSchema, data);
export const validateBomItemPricing = (data) => runValidation(BomItemPricingSchema, data);
export const validateBomBatchPricing = (data) => runValidation(BomBatchPricingSchema, data);
