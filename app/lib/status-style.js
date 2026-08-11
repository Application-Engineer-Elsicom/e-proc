/**
 * Warna badge untuk tiap status dokumen.
 *
 * Pasangannya adalah getStatusLabel / getBomStatusLabel di app/lib/permissions.js:
 * di sana teksnya, di sini warnanya. Sebelumnya tiap halaman punya peta warna
 * sendiri sehingga status yang sama bisa tampil beda warna antar layar.
 *
 * Nilai yang dikembalikan adalah nama variant Badge (app/components/ui/badge.js).
 */

const NEUTRAL = "neutral";
const INFO = "info";
const PROGRESS = "progress";
const SUCCESS = "success";
const DANGER = "danger";

// Status dokumen FR / MR / WR (enum Status)
const STATUS_TONE = {
  WAITING_WPO: PROGRESS,
  WAITING_SYSTEM: PROGRESS,
  WAITING_PM: PROGRESS,
  APPROVED: SUCCESS,
  PROCUREMENT_PROCESS: INFO,
  FINANCE_PAID: INFO,
  AVAILABLE_IN_WAREHOUSE: INFO,
  SHIPPED: SUCCESS,
  REJECTED: DANGER,
};

// Status Bill of Material (enum BomStatus)
const BOM_STATUS_TONE = {
  DRAFT: NEUTRAL,
  SUBMITTED: INFO,
  WPO_REVIEW: PROGRESS,
  WPO_APPROVED: INFO,
  WPO_REJECTED: DANGER,
  SYSTEM_REVIEW: PROGRESS,
  SYSTEM_APPROVED: INFO,
  SYSTEM_REJECTED: DANGER,
  REJECTED: DANGER,
  ACTIVE: SUCCESS,
  PRICED: SUCCESS,
  ARCHIVED: NEUTRAL,
};

// Status satu item BoM (enum BomItemStatus)
const BOM_ITEM_STATUS_TONE = {
  PENDING: NEUTRAL,
  REFINED: INFO,
  APPROVED: SUCCESS,
  REJECTED: DANGER,
  PRICED: SUCCESS,
};

// Prioritas Fault Report (enum Priority)
const PRIORITY_TONE = {
  LOW: NEUTRAL,
  MEDIUM: INFO,
  HIGH: PROGRESS,
  URGENT: DANGER,
};

// Status teknis Fault Report (enum FaultStatus)
const FAULT_STATUS_TONE = {
  OPEN: NEUTRAL,
  IN_PROGRESS: PROGRESS,
  CLOSED: SUCCESS,
};

// Kesehatan Purchase Order (enum POHealth)
const PO_HEALTH_TONE = {
  ON_TRACK: SUCCESS,
  WARNING: PROGRESS,
  CRITICAL: DANGER,
  LATE: DANGER,
  RECEIVED: INFO,
};

export const statusTone = (s) => STATUS_TONE[s] || NEUTRAL;
export const bomStatusTone = (s) => BOM_STATUS_TONE[s] || NEUTRAL;
export const bomItemStatusTone = (s) => BOM_ITEM_STATUS_TONE[s] || NEUTRAL;
export const priorityTone = (s) => PRIORITY_TONE[s] || NEUTRAL;
export const faultStatusTone = (s) => FAULT_STATUS_TONE[s] || NEUTRAL;
export const poHealthTone = (s) => PO_HEALTH_TONE[s] || NEUTRAL;
