/**
 * Permission Helper Functions
 * Role-based access control untuk BoM feature
 *
 * Usage:
 * - Import: import { checkBomPermission, canCreateBom } from '@/lib/permissions'
 * - Use: if (!canCreateBom(user)) throw new Error('Unauthorized')
 */

/**
 * Check if user can perform action on BoM
 * @param {Object} user - User object dari NextAuth session
 * @param {string} action - Action name (e.g., 'create', 'approve_wpo')
 * @param {string} bomStatus - Current BoM status (optional)
 * @returns {boolean} - True if allowed, false otherwise
 */
export function checkBomPermission(user, action, bomStatus = null) {
  if (!user) return false;

  const { role, engineerRole } = user;

  // Map actions to role requirements
  const actionPermissions = {
    // Marketing actions
    create: () => role === "MARKETING",
    edit_draft: () => role === "MARKETING",
    delete_draft: () => role === "MARKETING",
    submit_refinement: () => role === "MARKETING",
    archive: () => role === "MARKETING",
    view_own: () => role === "MARKETING",

    // Engineer Staff actions
    view_submitted: () => role === "ENGINEER" && engineerRole === "STAFF",
    refine_items: () => role === "ENGINEER" && engineerRole === "STAFF",
    submit_approval: () => role === "ENGINEER" && engineerRole === "STAFF",

    // Engineer WPO approval
    approve_wpo: () => role === "ENGINEER" && engineerRole === "WPO",
    reject_wpo: () => role === "ENGINEER" && engineerRole === "WPO",
    view_for_wpo_review: () => role === "ENGINEER" && engineerRole === "WPO",

    // Engineer System approval
    approve_system: () => role === "ENGINEER" && engineerRole === "SYSTEM",
    reject_system: () => role === "ENGINEER" && engineerRole === "SYSTEM",
    view_for_system_review: () =>
      role === "ENGINEER" && engineerRole === "SYSTEM",

    // Procurement actions
    add_pricing: () => role === "PROCUREMENT",
    view_approved: () => role === "PROCUREMENT",
  };

  // Execute permission check
  const permissionFn = actionPermissions[action];
  if (!permissionFn) {
    console.warn(`Unknown action: ${action}`);
    return false;
  }

  return permissionFn();
}

/**
 * Check if user can create BoM
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canCreateBom(user) {
  return checkBomPermission(user, "create");
}

/**
 * Check if user can edit BoM (only if DRAFT)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canEditBom(user) {
  return checkBomPermission(user, "edit_draft");
}

/**
 * Check if user can delete BoM (only if DRAFT)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canDeleteBom(user) {
  return checkBomPermission(user, "delete_draft");
}

/**
 * Check if user can refine BoM items
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canRefineBoM(user) {
  return checkBomPermission(user, "refine_items");
}

/**
 * Check if user can approve BoM at WPO stage
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canApproveWPO(user) {
  return checkBomPermission(user, "approve_wpo");
}

/**
 * Check if user can approve BoM at System stage
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canApproveSystem(user) {
  return checkBomPermission(user, "approve_system");
}

/**
 * Check if user can add pricing to BoM
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canAddPricing(user) {
  return checkBomPermission(user, "add_pricing");
}

/**
 * Check if user can view BoM
 * @param {Object} user - User object
 * @param {string} bomStatus - BoM status
 * @returns {boolean}
 */
export function canViewBom(user, bomStatus) {
  if (!user) return false;

  const { role } = user;

  // Everyone can view their own/assigned BoMs
  // MARKETING can view own
  if (role === "MARKETING") {
    return true; // Will be filtered by query for own BoMs
  }

  // ENGINEER can view SUBMITTED+
  if (role === "ENGINEER") {
    const viewableStatuses = [
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
    ];
    return viewableStatuses.includes(bomStatus);
  }

  // PROCUREMENT can view SYSTEM_APPROVED+
  if (role === "PROCUREMENT") {
    const viewableStatuses = [
      "SYSTEM_APPROVED",
      "SYSTEM_REJECTED",
      "ACTIVE",
      "ARCHIVED",
    ];
    return viewableStatuses.includes(bomStatus);
  }

  return false;
}

/**
 * Check if user can see pricing information
 * Only: Engineer (all sub-roles) & Procurement
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canSeePricing(user) {
  if (!user) return false;
  return user.role === "ENGINEER" || user.role === "PROCUREMENT";
}

/**
 * Check if user can see marketing baseline quantity
 * Marketing cannot see refined/priced quantities
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canSeeMarketingBaseline(user) {
  if (!user) return false;
  return user.role === "MARKETING" || user.role === "ENGINEER";
}

/**
 * Get user's available BoM actions based on role
 * Useful for UI to show/hide action buttons
 * @param {Object} user - User object
 * @param {string} bomStatus - Current BoM status
 * @returns {Object} - Map of actions user can perform
 */
export function getBomAvailableActions(user, bomStatus) {
  if (!user) return {};

  return {
    canCreate: canCreateBom(user),
    canEdit: canEditBom(user) && bomStatus === "DRAFT",
    canDelete: canDeleteBom(user) && bomStatus === "DRAFT",
    canSubmit: user.role === "MARKETING" && bomStatus === "DRAFT",
    canRefine:
      canRefineBoM(user) && bomStatus === "SUBMITTED",
    canSubmitApproval:
      user.role === "ENGINEER" &&
      user.engineerRole === "STAFF" &&
      bomStatus === "SUBMITTED",
    canApproveWPO: canApproveWPO(user) && bomStatus === "WPO_REVIEW",
    canRejectWPO: canApproveWPO(user) && bomStatus === "WPO_REVIEW",
    canApproveSystem: canApproveSystem(user) && bomStatus === "SYSTEM_REVIEW",
    canRejectSystem: canApproveSystem(user) && bomStatus === "SYSTEM_REVIEW",
    canAddPricing:
      canAddPricing(user) && bomStatus === "SYSTEM_APPROVED",
    canArchive: user.role === "MARKETING" && bomStatus === "ACTIVE",
    canView: canViewBom(user, bomStatus),
  };
}

/**
 * Get user's role display name
 * @param {Object} user - User object
 * @returns {string} - Display name
 */
export function getRoleDisplayName(user) {
  if (!user) return "Unknown";

  const { role, engineerRole } = user;

  if (role === "ENGINEER") {
    const roleMap = {
      STAFF: "Engineer Staff",
      WPO: "Engineer WPO",
      SYSTEM: "Engineer System",
    };
    return roleMap[engineerRole] || "Engineer";
  }

  const roleMap = {
    MARKETING: "Marketing",
    PROCUREMENT: "Procurement",
    PROJECT_MANAGER: "Project Manager",
    WAREHOUSE: "Warehouse / Gudang",
    FINANCE: "Finance",
    DOCUMENT_CONTROL: "Document Control",
  };

  return roleMap[role] || role;
}

/**
 * Check if user is engineer (any sub-role)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isEngineer(user) {
  return user && user.role === "ENGINEER";
}

/**
 * Check if user is engineer staff
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isEngineerStaff(user) {
  return user && user.role === "ENGINEER" && user.engineerRole === "STAFF";
}

/**
 * Check if user is engineer WPO
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isEngineerWPO(user) {
  return user && user.role === "ENGINEER" && user.engineerRole === "WPO";
}

/**
 * Check if user is engineer system
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isEngineerSystem(user) {
  return user && user.role === "ENGINEER" && user.engineerRole === "SYSTEM";
}

/**
 * Check if user is marketing
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isMarketing(user) {
  return user && user.role === "MARKETING";
}

// ─── FR / MR / WR Approval Permissions ───────────────────────────────────────

/**
 * Check if user can approve FR/MR/WR at WPO stage (Engineer WPO)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canApproveWpoEngineer(user) {
  return user && user.role === "ENGINEER" && user.engineerRole === "WPO";
}

/**
 * Check if user can approve FR/MR/WR at SYSTEM stage (Engineer SYSTEM)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canApproveSystemEngineer(user) {
  return user && user.role === "ENGINEER" && user.engineerRole === "SYSTEM";
}

/**
 * Check if user can approve FR/MR/WR at PM stage
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canApproveAsPM(user) {
  return user && user.role === "PROJECT_MANAGER";
}

/**
 * Get initial approval status for FR/MR/WR based on creator's engineerRole
 * STAFF  → WAITING_WPO
 * WPO    → WAITING_SYSTEM (skip own level)
 * SYSTEM → WAITING_PM    (skip own + WPO level)
 * @param {string} engineerRole - Creator's engineerRole
 * @returns {string} - Initial Status enum value
 */
export function getInitialApprovalStatus(engineerRole) {
  switch (engineerRole) {
    case "WPO":    return "WAITING_SYSTEM";
    case "SYSTEM": return "WAITING_PM";
    default:       return "WAITING_WPO";  // STAFF and unknown
  }
}

/**
 * Check if user is procurement
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isProcurement(user) {
  return user && user.role === "PROCUREMENT";
}

/** Staf gudang — modul /warehouse (Goods Receipt & approval WR sisi fisik). */
export function isWarehouse(user) {
  return user && user.role === "WAREHOUSE";
}

/** Boleh approve/reject WR dari sisi Warehouse (cek fisik ketersediaan). */
export function canApproveWRWarehouse(user) {
  return user && user.role === "WAREHOUSE";
}

/** Boleh approve/reject WR dari sisi Procurement (cek kelengkapan pengadaan). */
export function canApproveWRProcurement(user) {
  return user && user.role === "PROCUREMENT";
}

// ─── Label Status ────────────────────────────────────────────────────────────
// Satu tempat untuk semua nama status yang dilihat pengguna. Sebelumnya tiap
// halaman punya peta sendiri, sehingga daftar menulis "WPO Review" sementara
// dashboard menulis "WPO_REVIEW" untuk dokumen yang sama.

const STATUS_LABELS = {
  WAITING_WPO: "Menunggu WPO",
  WAITING_SYSTEM: "Menunggu SYSTEM",
  WAITING_PM: "Menunggu PM",
  APPROVED: "Disetujui",
  PROCUREMENT_PROCESS: "Proses Pengadaan",
  FINANCE_PAID: "Sudah Dibayar",
  AVAILABLE_IN_WAREHOUSE: "Tersedia di Gudang",
  SHIPPED: "Dikirim",
  REJECTED: "Ditolak",
};

const BOM_STATUS_LABELS = {
  DRAFT: "Draft",
  SUBMITTED: "Diajukan",
  WPO_REVIEW: "Tinjauan WPO",
  WPO_APPROVED: "Disetujui WPO",
  WPO_REJECTED: "Ditolak WPO",
  SYSTEM_REVIEW: "Tinjauan SYSTEM",
  SYSTEM_APPROVED: "Disetujui SYSTEM",
  SYSTEM_REJECTED: "Ditolak SYSTEM",
  REJECTED: "Ditolak",
  ACTIVE: "Aktif",
  PRICED: "Sudah Diharga",
  ARCHIVED: "Diarsipkan",
};

const BOM_ITEM_STATUS_LABELS = {
  PENDING: "Belum Dirinci",
  REFINED: "Sudah Dirinci",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  PRICED: "Sudah Diharga",
};

/** Ubah kode status jadi teks yang bisa dibaca pengguna. */
function labelFrom(map, status) {
  if (!status) return "—";
  return map[status] || String(status).replace(/_/g, " ");
}

/** Status dokumen FR / MR (enum Status). */
export function getStatusLabel(status) {
  return labelFrom(STATUS_LABELS, status);
}

// Warehouse Release memakai enum tersendiri (WrStatus) sejak approval-nya
// dipisah jadi dua sisi independen Warehouse + Procurement.
const WR_STATUS_LABELS = {
  PENDING_APPROVAL: "Menunggu Approval",
  WAREHOUSE_APPROVED: "Disetujui Warehouse (menunggu Procurement)",
  PROCUREMENT_APPROVED: "Disetujui Procurement (menunggu Warehouse)",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  SHIPPED: "Dikirim",
};

/** Status Warehouse Release (enum WrStatus). */
export function getWrStatusLabel(status) {
  return labelFrom(WR_STATUS_LABELS, status);
}

/** Status Bill of Material (enum BomStatus). */
export function getBomStatusLabel(status) {
  return labelFrom(BOM_STATUS_LABELS, status);
}

/** Status satu item di dalam BoM (enum BomItemStatus). */
export function getBomItemStatusLabel(status) {
  return labelFrom(BOM_ITEM_STATUS_LABELS, status);
}

const PRIORITY_LABELS = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
};

const FAULT_STATUS_LABELS = {
  OPEN: "Terbuka",
  IN_PROGRESS: "Ditangani",
  CLOSED: "Selesai",
};

/** Tingkat prioritas Fault Report (enum Priority). */
export function getPriorityLabel(priority) {
  return labelFrom(PRIORITY_LABELS, priority);
}

/** Status teknis Fault Report (enum FaultStatus). */
export function getFaultStatusLabel(status) {
  return labelFrom(FAULT_STATUS_LABELS, status);
}
