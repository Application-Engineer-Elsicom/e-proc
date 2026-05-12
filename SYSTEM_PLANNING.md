# E-Procurement System — Master Planning Document
> Last Updated: 2026-05-07  
> Status: Active Development

---

## 📁 Daftar Isi
1. [Gambaran Sistem](#1-gambaran-sistem)
2. [Role & Permission Matrix](#2-role--permission-matrix)
3. [Workflow Approval](#3-workflow-approval)
4. [BoM Feature — Status & Planning](#4-bom-feature--status--planning)
5. [FR / MR / WR Feature — Planning Baru](#5-fr--mr--wr-feature--planning-baru)
6. [Conflict Analysis](#6-conflict-analysis)
7. [Schema Changes Plan](#7-schema-changes-plan)
8. [Phase Implementation Plan](#8-phase-implementation-plan)

---

## 1. Gambaran Sistem

Aplikasi E-Procurement mengelola alur pengadaan material dari permintaan hingga penerimaan gudang.  
Terdapat dua sistem utama yang berjalan **paralel dan terpisah**:

| Sistem | Deskripsi | Status |
|--------|-----------|--------|
| **BoM System** | Bill of Material — perencanaan kebutuhan proyek baru | ✅ Sudah Implemented |
| **FR/MR/WR System** | Fault Report, Material Request, Warehouse Release — operasional harian | 🔄 Perlu Update Workflow |

---

## 2. Role & Permission Matrix

### Top-Level Roles (`Role` enum)
| Role | Deskripsi | Akses Utama |
|------|-----------|-------------|
| `MARKETING` | Tim marketing, buat BoM | `/marketing/**` |
| `ENGINEER` | Tim engineer, sub-role wajib diisi | `/engineer/**` |
| `PROCUREMENT` | Tim pengadaan, input harga BoM | `/procurement/**` |
| `PROJECT_MANAGER` | Manajer proyek, approval final | `/pm/**` |
| `WPO` | ⚠️ **DEPRECATED** — digantikan oleh `engineerRole:WPO` | `/wpo/**` (lama) |
| `FINANCE` | Tim keuangan | TBD |
| `WAREHOUSE` | Tim gudang | TBD |

### Engineer Sub-Roles (`EngineerRole` enum)
| Sub-Role | Deskripsi | Tugas di BoM | Tugas di FR/MR/WR |
|----------|-----------|--------------|-------------------|
| `STAFF` | Engineer staff | Refine items, buat sub-items | **Buat** FR/MR/WR |
| `WPO` | Work Package Officer | Approve & edit BoM, assign ke SYSTEM | **Approval Level 1** FR/MR/WR |
| `SYSTEM` | System engineer | Activate BoM (final engineer) | **Approval Level 2** FR/MR/WR |

> **Penting:** `role:"WPO"` (top-level) ≠ `engineerRole:"WPO"` (sub-role Engineer).  
> Workflow baru FR/MR/WR menggunakan `engineerRole` bukan `role:"WPO"`.

---

## 3. Workflow Approval

### 3.1 BoM Workflow ✅ (Sudah Implemented)

```
Marketing          Engineer STAFF       Engineer WPO        Engineer SYSTEM     Procurement
    │                    │                    │                    │                 │
    ├── Buat BoM ──────► │                   │                   │                 │
    │   (DRAFT)          │                   │                   │                 │
    │                    │                   │                   │                 │
    ├── Submit ─────────►│                   │                   │                 │
    │   (SUBMITTED)      │                   │                   │                 │
    │                    │                   │                   │                 │
    │              Assign to WPO ──────────► │                   │                 │
    │              Refine items              │                   │                 │
    │              (WPO_REVIEW)              │                   │                 │
    │                                        │                   │                 │
    │                               Edit & Approve              │                 │
    │                               Assign to SYSTEM ──────────►│                 │
    │                               (SYSTEM_REVIEW)             │                 │
    │                                                            │                 │
    │                                                     Activate BoM            │
    │                                                     (ACTIVE) ──────────────►│
    │                                                                              │
    │                                                                    Input harga
    │                                                                    (PRICED)  │
    │◄────────────────────────────────────────────────────────────────────────────┤
    │  "BoM Ready from Procurement"                                                │
```

**Status Flow:** `DRAFT` → `SUBMITTED` → `WPO_REVIEW` → `SYSTEM_REVIEW` → `ACTIVE` → `PRICED`

**Assignment Chain:**
- Marketing → assign ke STAFF Engineer (saat submit)
- STAFF Engineer → assign ke WPO Engineer (saat kirim ke WPO)
- WPO Engineer → assign ke SYSTEM Engineer (saat approve ke SYSTEM)

---

### 3.2 FR/MR/WR Workflow 🔄 (Akan Diimplementasi)

#### Bila STAFF yang buat:
```
Engineer STAFF → Engineer WPO → Engineer SYSTEM → Project Manager → Procurement/Resolve
  WAITING_WPO →  WAITING_SYSTEM →   WAITING_PM  →    APPROVED    → PROCUREMENT_PROCESS
```

#### Bila WPO yang buat:
```
Engineer WPO → Engineer SYSTEM → Project Manager → Procurement/Resolve
WAITING_SYSTEM →   WAITING_PM  →    APPROVED    → PROCUREMENT_PROCESS
```

#### Bila SYSTEM yang buat (asumsi):
```
Engineer SYSTEM → Project Manager → Procurement/Resolve
  WAITING_PM    →    APPROVED     → PROCUREMENT_PROCESS
```

**Applies to:** Material Request, Fault Report, Warehouse Release

---

## 4. BoM Feature — Status & Planning

### ✅ Sudah Implemented

#### Core Architecture
- [x] Schema: `BillOfMaterial`, `BomItem`, `BomSubItem`, `BomHistory`
- [x] Status flow: `DRAFT → SUBMITTED → WPO_REVIEW → SYSTEM_REVIEW → ACTIVE → PRICED`
- [x] Dual-mode refinement (Direct Fill vs Sub-items)
- [x] Marketing create page (description only, no quantity)

#### Assignment Chain
- [x] Marketing → assign STAFF saat submit
- [x] STAFF → assign WPO saat kirim ke approval
- [x] WPO → assign SYSTEM saat approve
- [x] Schema: `assignedToStaff`, `assignedToWpo`, `assignedToSystem` di `BillOfMaterial`

#### Access Control
- [x] Engineer Layout: session check + role check
- [x] Refine page: redirect jika bukan STAFF
- [x] Approve page: redirect jika bukan WPO/SYSTEM
- [x] Server actions: permission check per fungsi

#### WPO Capabilities
- [x] Edit refined items (qty, unit, specs)
- [x] Switch mode: direct fill ↔ sub-items
- [x] Tambah/hapus sub-items
- [x] Assign ke SYSTEM sebelum approve

#### Marketing Dashboard
- [x] Status badge `PRICED` = "BoM Ready from Procurement"
- [x] Filter berdasarkan semua status termasuk PRICED

---

### 📝 BoM — Files yang Sudah Ada

| File | Fungsi |
|------|--------|
| `prisma/schema.prisma` | Model `BillOfMaterial`, `BomItem`, `BomSubItem`, `BomHistory` |
| `app/actions/engineer.js` | Semua BoM engineer actions |
| `app/actions/bom.js` | Marketing BoM actions |
| `app/actions/procurement.js` | Procurement pricing actions |
| `app/lib/permissions.js` | `canRefineBoM()`, `canApproveWPO()`, `canApproveSystem()` |
| `app/lib/bom-utils.js` | Helper `createHistoryEntry()` |
| `app/engineer/bom/**` | List, Refine, Approve pages |
| `app/marketing/bom/**` | List, Create, Detail pages |
| `app/procurement/bom/**` | List, Pricing pages |

---

## 5. FR / MR / WR Feature — Planning Baru

### 5.1 Material Request

**Current State:**
- ✅ Create MR (semua engineer)
- ✅ Approval Level WPO: `role:"WPO"` approve (akan deprecated)
- ✅ Approval Level PM: `role:"PROJECT_MANAGER"` approve
- ❌ Tidak ada SYSTEM approval
- ❌ `getMaterialRequests()` tidak ada data ownership filtering

**Target State:**
- ✅ Create MR dengan auto-detect status awal berdasarkan `engineerRole`
- ✅ Approval Level 1: `engineerRole:"WPO"` (WAITING_WPO → WAITING_SYSTEM)
- ✅ Approval Level 2: `engineerRole:"SYSTEM"` (WAITING_SYSTEM → WAITING_PM)
- ✅ Approval Level 3: `role:"PROJECT_MANAGER"` (WAITING_PM → APPROVED)
- ✅ Data filtering per role
- ✅ Deprecated: `role:"WPO"` approval

---

### 5.2 Fault Report

**Current State:**
- ✅ Create FR (semua engineer)
- ❌ Status sederhana: OPEN → IN_PROGRESS → CLOSED
- ❌ Tidak ada approval chain
- ❌ Tidak ada data ownership filtering
- ❌ Tidak ada WPO/SYSTEM/PM tracking fields

**Target State:**
- ✅ Create FR dengan auto-detect status awal
- ✅ Approval Level 1: `engineerRole:"WPO"` 
- ✅ Approval Level 2: `engineerRole:"SYSTEM"`
- ✅ Approval Level 3: `role:"PROJECT_MANAGER"`
- ✅ Status teknis (OPEN/IN_PROGRESS/CLOSED) tetap ada terpisah dari approval status
- ✅ Data filtering per role

---

### 5.3 Warehouse Release

**Current State:**
- ✅ Create WR (semua engineer, linked ke approved MR)
- ❌ Tidak ada status field di model
- ❌ Tidak ada approval chain
- ❌ Tidak ada data ownership filtering

**Target State:**
- ✅ Create WR dengan auto-detect status awal
- ✅ Approval Level 1: `engineerRole:"WPO"`
- ✅ Approval Level 2: `engineerRole:"SYSTEM"`
- ✅ Approval Level 3: `role:"PROJECT_MANAGER"`
- ✅ Status field baru di model
- ✅ Data filtering per role

---

### 5.4 View per Engineer Sub-Role (semua 3 fitur)

| Sub-Role | Tab/View yang Tampil |
|----------|---------------------|
| **STAFF** | "My Submissions" — dokumen yang saya buat |
| **WPO** | "Pending My Approval" (status: WAITING_WPO) + "My Submissions" |
| **SYSTEM** | "Pending My Approval" (status: WAITING_SYSTEM) + "My Submissions" |

---

## 6. Conflict Analysis

### BoM vs FR/MR/WR — File Comparison

| Komponen | BoM | FR/MR/WR | Konflik? |
|----------|-----|----------|----------|
| **Status Enum** | `BomStatus` (terpisah) | `Status` enum (update) | ❌ Tidak |
| **Action Files** | `engineer.js`, `bom.js`, `procurement.js` | `material-request.js`, `fault-report.js`, `warehouse-release.js` | ❌ Tidak |
| **Permissions** | `canApproveWPO()`, `canApproveSystem()` | `canApproveWpoEngineer()` (BARU) | ❌ Tidak |
| **Schema Models** | `BillOfMaterial`, `BomItem`, dll | `MaterialRequest`, `FaultReport`, `WarehouseRelease` | ❌ Tidak |
| **Engineer Pages** | `/engineer/bom/**` | `/engineer/material-request/**`, dll | ❌ Tidak |
| **Layout Nav** | Link BoM List (tetap) | Tambah MR/FR/WR links | ❌ Tidak |
| **Engineer Layout** | Session + role check (tetap) | Tidak berubah | ❌ Tidak |
| **`engineerRole` usage** | Di `engineer.js` | Di actions baru (pola sama) | ❌ Tidak |

### Files yang TIDAK BOLEH Diubah (BoM sudah final)

```
❌ JANGAN UBAH:
  app/actions/engineer.js       — BoM engineer actions
  app/actions/bom.js            — Marketing BoM actions
  app/actions/procurement.js    — Procurement actions
  app/lib/bom-utils.js          — BoM utilities
  app/lib/permissions.js        — Hanya TAMBAH fungsi baru, jangan ubah yang ada
  app/engineer/bom/**           — Semua BoM pages
  app/marketing/**              — Marketing pages
  app/procurement/**            — Procurement pages
  prisma/schema.prisma          — BomStatus enum, semua Bom* models
```

### Files yang AMAN Diubah

```
✅ AMAN DIUBAH:
  prisma/schema.prisma          — Hanya tambah WAITING_SYSTEM ke Status enum
                                  + tambah fields baru ke MR/FR/WR models
  app/actions/material-request.js — Update create logic + tambah approval funcs
  app/actions/fault-report.js     — Update create logic + tambah approval funcs
  app/actions/warehouse-release.js — Update create logic + tambah approval funcs
  app/actions/pm.js               — Tambah fungsi FR/WR approval
  app/lib/permissions.js          — Tambah fungsi baru (tidak ubah existing)
  app/engineer/layout.js          — Hanya TAMBAH nav links
  app/engineer/material-request/page.js — Role-based view
  app/engineer/fault-report/page.js     — Role-based view
  app/engineer/warehouse-release/page.js — Role-based view
  app/pm/page.js                  — Tambah tab FR/WR
  
⚠️ AKAN DEPRECATED (tetap ada, tidak dihapus):
  app/actions/wpo.js              — approveMaterialRequest() dengan role:"WPO"
  app/wpo/page.js                 — Dashboard WPO role lama
```

---

## 7. Schema Changes Plan

### 7.1 `Status` enum — Tambah `WAITING_SYSTEM`

```prisma
enum Status {
  WAITING_WPO             // Menunggu Engineer WPO
  WAITING_SYSTEM          // ← TAMBAH BARU — Menunggu Engineer SYSTEM
  WAITING_PM              // Menunggu Project Manager
  APPROVED                // PM sudah approve
  PROCUREMENT_PROCESS     // Sedang di procurement
  FINANCE_PAID            // Finance sudah bayar
  AVAILABLE_IN_WAREHOUSE  // Tersedia di gudang
  SHIPPED                 // Dikirim
  REJECTED                // Ditolak
}
```

### 7.2 `MaterialRequest` model — Tambah SYSTEM tracking

```prisma
model MaterialRequest {
  // ... fields existing tetap ...

  // TAMBAH fields baru:
  systemApprovedBy    String?
  systemApprover      User?     @relation("MRSystemApprovedBy", fields: [systemApprovedBy], references: [id])
  systemApprovedAt    DateTime?

  // UBAH MAKNA (field sudah ada, tidak perlu ubah nama):
  // wpoApprovedBy → sekarang = engineerRole:"WPO" yang approve (bukan role:"WPO")
  // wpoApprover   → relasi User tetap sama
}
```

### 7.3 `FaultReport` model — Tambah approval tracking

```prisma
model FaultReport {
  // ... fields existing tetap ...
  // FaultStatus (OPEN/IN_PROGRESS/CLOSED) TETAP untuk status teknis

  // TAMBAH fields baru untuk approval chain:
  approvalStatus      Status?              // null = belum disubmit untuk approval
  wpoApprovedBy       String?
  wpoApprover         User?    @relation("FRWpoApprovedBy", fields: [wpoApprovedBy], references: [id])
  wpoApprovedAt       DateTime?
  systemApprovedBy    String?
  systemApprover      User?    @relation("FRSystemApprovedBy", fields: [systemApprovedBy], references: [id])
  systemApprovedAt    DateTime?
  pmApprovedBy        String?
  pmApprover          User?    @relation("FRPmApprovedBy", fields: [pmApprovedBy], references: [id])
  pmApprovedAt        DateTime?
}
```

### 7.4 `WarehouseRelease` model — Tambah status + approval

```prisma
model WarehouseRelease {
  // ... fields existing tetap ...

  // TAMBAH fields baru:
  status              Status    @default(WAITING_WPO)
  wpoApprovedBy       String?
  wpoApprover         User?    @relation("WRWpoApprovedBy", fields: [wpoApprovedBy], references: [id])
  wpoApprovedAt       DateTime?
  systemApprovedBy    String?
  systemApprover      User?    @relation("WRSystemApprovedBy", fields: [systemApprovedBy], references: [id])
  systemApprovedAt    DateTime?
  pmApprovedBy        String?
  pmApprover          User?    @relation("WRPmApprovedBy", fields: [pmApprovedBy], references: [id])
  pmApprovedAt        DateTime?
}
```

### 7.5 `User` model — Tambah inverse relations

```prisma
model User {
  // ... existing relations tetap (jangan diubah) ...

  // TAMBAH inverse relations untuk MR SYSTEM:
  mrSystemApproved         MaterialRequest[]  @relation("MRSystemApprovedBy")

  // TAMBAH inverse relations untuk FR:
  faultReportsWpoApproved  FaultReport[]      @relation("FRWpoApprovedBy")
  faultReportsSysApproved  FaultReport[]      @relation("FRSystemApprovedBy")
  faultReportsPmApproved   FaultReport[]      @relation("FRPmApprovedBy")

  // TAMBAH inverse relations untuk WR:
  wrWpoApproved            WarehouseRelease[] @relation("WRWpoApprovedBy")
  wrSysApproved            WarehouseRelease[] @relation("WRSystemApprovedBy")
  wrPmApproved             WarehouseRelease[] @relation("WRPmApprovedBy")
}
```

---

## 8. Phase Implementation Plan

### Phase 1 — Schema & Database ✅ *SELESAI*

| No | Pekerjaan | File | Catatan |
|----|-----------|------|---------|
| 1.1 | Tambah `WAITING_SYSTEM` ke `Status` enum | `prisma/schema.prisma` | |
| 1.2 | Tambah `systemApprovedBy/At` ke `MaterialRequest` | `prisma/schema.prisma` | |
| 1.3 | Tambah approval fields ke `FaultReport` | `prisma/schema.prisma` | |
| 1.4 | Tambah `status` + approval fields ke `WarehouseRelease` | `prisma/schema.prisma` | |
| 1.5 | Tambah inverse relations ke `User` model | `prisma/schema.prisma` | |
| 1.6 | Run `npx prisma db push` | Terminal | |
| 1.7 | Run `npx prisma generate` | Terminal | Matikan dev server dulu |

**Estimasi: 30–40 menit**

---

### Phase 2 — Server Actions ✅ *SELESAI*

| No | Pekerjaan | File | Fungsi Baru |
|----|-----------|------|-------------|
| 2.1 | Tambah permission helpers | `app/lib/permissions.js` | `canApproveWpoEngineer()`, `canApproveSystemEngineer()` |
| 2.2 | Update create logic MR | `app/actions/material-request.js` | Status awal berdasarkan engineerRole |
| 2.3 | Tambah approval funcs MR | `app/actions/material-request.js` | `approveMRByWpo()`, `approveMRBySystem()`, `getMRsForWpoReview()`, `getMRsForSystemReview()` |
| 2.4 | Update get func MR | `app/actions/material-request.js` | Role-based filtering |
| 2.5 | Update create logic FR | `app/actions/fault-report.js` | Status awal berdasarkan engineerRole |
| 2.6 | Tambah approval funcs FR | `app/actions/fault-report.js` | `approveFRByWpo()`, `approveFRBySystem()`, `getFRsForWpoReview()`, `getFRsForSystemReview()` |
| 2.7 | Update get func FR | `app/actions/fault-report.js` | Role-based filtering |
| 2.8 | Update create logic WR | `app/actions/warehouse-release.js` | Status awal berdasarkan engineerRole |
| 2.9 | Tambah approval funcs WR | `app/actions/warehouse-release.js` | `approveWRByWpo()`, `approveWRBySystem()`, `getWRsForWpoReview()`, `getWRsForSystemReview()` |
| 2.10 | Update get func WR | `app/actions/warehouse-release.js` | Role-based filtering |
| 2.11 | Update PM actions | `app/actions/pm.js` | Tambah `approveFaultReportPM()`, `approveWarehouseReleasePM()`, `getPendingFRForPM()`, `getPendingWRForPM()` |

**Estimasi: 2–3 jam**

---

### Phase 3 — UI Pages ✅ *SELESAI*

| No | Pekerjaan | File | Deskripsi |
|----|-----------|------|-----------|
| 3.1 | Tambah nav links | `app/engineer/layout.js` | Tambah MR, FR, WR ke navigation |
| 3.2 | Role-based MR list | `app/engineer/material-request/page.js` | Tabs: My Submissions / Pending Approval |
| 3.3 | Role-based FR list | `app/engineer/fault-report/page.js` | Tabs: My Submissions / Pending Approval |
| 3.4 | Role-based WR list | `app/engineer/warehouse-release/page.js` | Tabs: My Submissions / Pending Approval |
| 3.5 | Update PM dashboard | `app/pm/page.js` | Tambah tab FR dan WR |

**Estimasi: 2–3 jam**

---

### Phase 4 — Testing & Seed Data

| No | Pekerjaan | File |
|----|-----------|------|
| 4.1 | Update seed data | `seed.cjs` |
| 4.2 | Test full workflow STAFF: MR/FR/WR | Manual |
| 4.3 | Test full workflow WPO creates | Manual |
| 4.4 | Test approval chain end-to-end | Manual |
| 4.5 | Test BoM workflow tidak terpengaruh | Manual |

---

## 9. Test Credentials

```
STAFF Engineer:  engineer.staff@test.com  / password123
WPO Engineer:    engineer.wpo@test.com    / password123
SYSTEM Engineer: engineer.system@test.com / password123
Project Manager: (belum ada di seed — perlu ditambah)
Marketing:       marketing@test.com       / password123
Procurement:     procurement@test.com     / password123
```

> **Note:** User `role:"PROJECT_MANAGER"` belum ada di seed data. Perlu ditambah di Phase 4.

---

## 10. Summary Status Keseluruhan

```
BoM System:
  ✅ Schema (BillOfMaterial, BomItem, BomSubItem, BomHistory)
  ✅ Assignment chain (Marketing→STAFF→WPO→SYSTEM)
  ✅ Dual-mode refinement (Direct Fill / Sub-items)
  ✅ WPO edit capability + sub-items
  ✅ SYSTEM activate → auto-forward ke Procurement
  ✅ Marketing lihat status PRICED
  ✅ Access control (route + server action)

FR/MR/WR System:
  ✅ Create (existing, semua engineer)
  ✅ Basic schema (existing)
  ✅ Phase 1: Schema update (WAITING_SYSTEM + approval fields)
  ✅ Phase 2: Server actions dengan approval chain
  ✅ Phase 3: UI pages role-based
  ⬜ Phase 4: Testing & seed data
```
