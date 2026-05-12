# Procurement Module — Planning Document (FINAL)
> Created: 2026-05-09 | Last Updated: 2026-05-09
> Status: **FINAL — Siap Implement**
> Reference: Figma design (5 screens) + Konfirmasi user

---

## 📁 Daftar Isi
1. [Gambaran & Scope](#1-gambaran--scope)
2. [Struktur Navigasi Final](#2-struktur-navigasi-final)
3. [Alur Data (Flow Diagram)](#3-alur-data-flow-diagram)
4. [Screen Specification](#4-screen-specification)
5. [Schema Database](#5-schema-database)
6. [Integration Existing System](#6-integration-existing-system)
7. [Phase Implementation Plan](#7-phase-implementation-plan)
8. [Files Map](#8-files-map)

---

## 1. Gambaran & Scope

### In-Scope (project ini)
| Fitur | Keterangan |
|-------|-----------|
| ✅ Procurement Dashboard | Engineer requests stats + PO stats + Financial chart |
| ✅ PO Plan | Spreadsheet-style table, tabs: PO Plan / WR Plan / Fault Report / Borrowed |
| ✅ PO List | Daftar PO yang sudah dieksekusi, tabs: PO List / Dashboard / Daftar Harga Satuan |
| ✅ Borrowed Management | Peminjaman barang antar project |
| ✅ Daftar Harga Satuan | Master harga supplier per item |
| ✅ Project Budget | Input manual oleh Head Procurement |

### Out-of-Scope (next development)
| Fitur | Alasan |
|-------|--------|
| ❌ Finances module | Terlalu besar, next phase |
| ❌ Back Office module | Terlalu besar, next phase |
| ❌ BoM → PO Plan | BoM pakai flow existing terpisah |

### Existing yang TIDAK BOLEH DIUBAH
```
app/procurement/bom/**       → BoM pricing (tetap jalan)
app/actions/procurement.js   → BoM procurement actions
```

---

## 2. Struktur Navigasi Final

### Layout: Dark Sidebar (sesuai design)
```
┌─────────────────────┬──────────────────────────────────────┐
│  [Elsicom logo]     │                                      │
│  ─────────────────  │         MAIN CONTENT                 │
│  📊 Dashboard       │                                      │
│  ─────────────────  │                                      │
│  📋 PO Plan         │                                      │
│                     │                                      │
│  📄 PO List         │                                      │
│                     │                                      │
│  [space]            │                                      │
│                     │                                      │
│  💰 Finances (TBD)  │                                      │
│                     │                                      │
│  🏢 Back Office TBD │                                      │
└─────────────────────┴──────────────────────────────────────┘
```

### Sub-Navigation Per Halaman (Bottom Tabs)

**PO Plan** tabs:
```
[ PO Plan ] [ WR Plan ] [ Fault Report ] [ Borrowed ]
```

**PO List** tabs:
```
[ PO List ] [ Dashboard ] [ Daftar Harga Satuan ]
```

---

## 3. Alur Data (Flow Diagram)

### 3.1 Alur Utama: Engineer → Procurement → PO

```
ENGINEER SIDE                    PROCUREMENT SIDE
─────────────────────────────────────────────────
                                      │
MR (APPROVED by PM) ─────────────────►  Muncul di Dashboard
WR (APPROVED by PM) ─────────────────►  "Not Processed" counter
FR (APPROVED by PM) ─────────────────►
                                      │
                                 Head Procurement buat PO Plan
                                 (dari MR items / manual)
                                      │
                                 PO dieksekusi ke Supplier
                                 → PO List (dengan PO Number)
                                      │
                                 Track delivery:
                                 ON_TRACK → WARNING → CRITICAL → LATE
                                      │
                                 Barang tiba di gudang
                                 → Input Mat In date (Procurement/Warehouse)
                                      │
ENGINEER buat WR ◄──────────────────── Barang sudah ready di gudang
(Warehouse Release request           │
 ke site untuk project)              ▼
                                 WR muncul di "WR Plan" tab
                                 → Procurement proses & buat WR list
                                      │
                                 Invoice tracking
                                 → Input Inv1, Inv2, dst
```

### 3.2 Alur Borrowed (Peminjaman Antar Project)

```
Project 2334 punya stock item ready
        │
        ▼
Project 2244 butuh item tsb (deadline lebih dekat)
Head Procurement buat Borrowed request
        │
        ▼
Item dipinjam dari Project 2334 ke Project 2244
Status: BORROWED → RETURNED
        │
        ▼
Muncul di tab "Borrowed" dalam PO Plan
```

### 3.3 PO Number Format

```
Format: [seq_3digit]/[projectCode]/Elsicom
Contoh: 001/2499/Elsicom
        038/2444/Elsicom

Sequence: Per project code (reset per project)
Rules:
  - Auto-generate saat buat PO baru
  - Bisa diedit manual sebelum save
  - Unique constraint di database
```

### 3.4 PO Health Auto-Calculation

```
Saat fetch/display PO, hitung dari deliveryTime vs today:
  RECEIVED  → matIn date exists & semua item sudah Mat In
  ON_TRACK  → deliveryTime - today > 14 hari
  WARNING   → 7 < (deliveryTime - today) ≤ 14 hari
  CRITICAL  → 0 < (deliveryTime - today) ≤ 7 hari
  LATE      → today > deliveryTime && belum full received
```

---

## 4. Screen Specification

### 4.1 Procurement Dashboard (`/procurement`)

```
┌──────────────────────────────────────────────────────────────┐
│  ENGINEER'S REQUESTS                                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │ Material Request│ │Warehouse Release│ │  Fault Report   │ │
│  │  Not Processed  │ │  Not Processed  │ │  Not Processed  │ │
│  │       2         │ │       2         │ │      10         │ │
│  │  (yellow card)  │ │   (red card)    │ │  (green card)   │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
├───────────────────────────┬──────────────────────────────────┤
│ PROCUREMENT DASHBOARD     │ FINANCIAL DASHBOARD              │
│ Filter: [Year▼] [Proj▼]   │ Filter: [Year▼]                  │
│                           │                                  │
│ ┌─ Number of PO: 2 ─────┐ │ [Bar Chart: Budget vs Spending]  │
│ │   Released             │ │  X-axis: Project IDs            │
│ ├─ Pending PO: 2 ───────┤ │  Black: Budget                   │
│ │   Not Received         │ │  Red: Spending                   │
│ ├─ Late PO: 2 ──────────┤ │                                  │
│ │                        │ │                                  │
│ └────────────────────────┘ │                                  │
│                           │                                  │
│ FINANCIAL OVERVIEW        │                                  │
│ Filter: [Year▼] [Proj▼]   │                                  │
│ Total Spent:  Rp 50 M     │                                  │
│ Total Budget: Rp 100 M    │                                  │
└───────────────────────────┴──────────────────────────────────┘
```

**Data Sources:**
| Widget | Query |
|--------|-------|
| MR Not Processed | `MaterialRequest.count({ status: 'APPROVED' })` — sudah approved PM tapi belum ada PO |
| WR Not Processed | `WarehouseRelease.count({ status: 'APPROVED' })` |
| FR Not Processed | `FaultReport.count({ approvalStatus: 'APPROVED' })` |
| PO Released | `PurchaseOrder.count({ status: 'RELEASED' })` + filter |
| Pending PO | `PurchaseOrder.count` where tidak semua item `matIn != null` |
| Late PO | `PurchaseOrder.count({ poHealth: 'LATE' })` |
| Total Spent | `SUM(PurchaseOrder.totalAmount)` filter year + project |
| Total Budget | `SUM(ProjectBudget.budget)` filter year + project |
| Chart data | Per project: budget dari `ProjectBudget`, spending dari `SUM(PO.totalAmount)` |

---

### 4.2 PO Plan — Tab "PO Plan" (`/procurement/po-plan`)

**Header:**
- Title: "PO Plan" + subtitle "Dashboard"
- 3 stat cards (sama seperti Dashboard)
- Button: "Create PO" (black pill)

**Table Columns (spreadsheet-style, sortable/filterable):**
| Kolom | Field | Keterangan |
|-------|-------|-----------|
| Description | `POItem.description` | Nama item |
| Part Number | `POItem.partNumber` | |
| Q'ty | `POItem.qty` | |
| PO | `PurchaseOrder.poNumber` | Kosong = belum ada PO |
| Mat In | `POItem.matIn` | Tanggal diterima di gudang |
| WR | `WarehouseRelease.docNo` | WR terkait |
| Unit | `POItem.unit` | |
| Project ID | `PurchaseOrder.projectCode` | |
| No Urut PR | `POItem.prNo` | Nomor urut PR |
| Tgl Purchase Requisition | `POItem.prDate` | Tanggal PR |
| Tgl Total PR Process | `POItem.prProcessDate` | |

**Features:**
- Filter dropdown per kolom
- Row click → detail/edit
- Inline edit untuk Mat In date (procurement warehouse team input)

---

### 4.3 PO Plan — Tab "WR Plan"

Menampilkan **Warehouse Release yang sudah APPROVED** (by PM) dan perlu diproses oleh Procurement untuk pengeluaran fisik dari gudang ke site.

**Table Columns:**
| Kolom | Field |
|-------|-------|
| WR Number | `WarehouseRelease.docNo` |
| Project | `WarehouseRelease.projectName/projectId` |
| Dibuat Oleh | `requester.name` |
| Delivery Location | `WarehouseRelease.deliveryLocation` |
| Items Count | count of items |
| Approved By PM | tanggal approval PM |
| Status | status proses procurement |

---

### 4.4 PO Plan — Tab "Fault Report"

Menampilkan **Fault Reports yang sudah APPROVED** (by PM) yang perlu ditindaklanjuti Procurement (beli spare part, repair, dll).

**Table Columns:**
| Kolom | Field |
|-------|-------|
| FR Number | `FaultReport.docNo` |
| Project | `FaultReport.projectName` |
| Item | `FaultReport.itemName` |
| Issue | `FaultReport.faultIssue` |
| Priority | `FaultReport.priority` |
| Reporter | `reporter.name` |
| Approved At | tanggal approval PM |

---

### 4.5 PO Plan — Tab "Borrowed"

Manajemen peminjaman barang antar project.

**Header:** "Create Borrowed" button

**Table Columns:**
| Kolom | Field | Keterangan |
|-------|-------|-----------|
| Doc No | `BorrowedItem.docNo` | BR-2026-XXXX |
| From Project | `BorrowedItem.fromProjectId` | Project sumber |
| To Project | `BorrowedItem.toProjectId` | Project penerima |
| Description | `BorrowedItem.description` | Item |
| Qty | `BorrowedItem.qty` | |
| Unit | `BorrowedItem.unit` | |
| Due Date | `BorrowedItem.dueDate` | Kapan harus dikembalikan |
| Status | `BorrowedItem.status` | BORROWED / RETURNED |
| Action | — | Mark as Returned |

---

### 4.6 PO List (`/procurement/po-list`) — Tab "PO List"

**Table Columns (spreadsheet-style):**
| Kolom | Field | Keterangan |
|-------|-------|-----------|
| No | auto | Nomor urut |
| Purchase Order Date | `PurchaseOrder.poDate` | |
| Project Code | `PurchaseOrder.projectCode` | |
| PO Number | `PurchaseOrder.poNumber` | Editable saat create |
| Supplier | `PurchaseOrder.supplierName` | |
| Delivery Time | `PurchaseOrder.deliveryTime` | Target delivery |
| PO Health | `PurchaseOrder.poHealth` | Color-coded |
| Term of Payment | `PurchaseOrder.termOfPayment` | |
| Descriptions | `POItem.description` | (multi-item, joined) |
| Qty | `POItem.qty` | |
| Inv1, Inv2... | `POInvoice[]` | Tidak ada batas max |

**Row Color Coding:**
- 🟢 Hijau: `RECEIVED` (semua item sudah Mat In)
- 🟡 Kuning: `WARNING`
- 🟠 Orange: `CRITICAL`
- 🔴 Merah: `LATE`
- Putih/Default: `ON_TRACK`

---

### 4.7 PO List — Tab "Dashboard" (Detail Procurement)

**"Orders Requiring Attention" table:**
| Kolom | Keterangan |
|-------|-----------|
| PO Number | Link ke detail PO |
| Project ID | |
| PO Date | |
| Supplier Name | |
| PO Health | Color badge |
| Target Date | |

**Counts at top:**
- Warning: [count]
- Critical: [count]
- Late: [count]

**Project Summary table (kanan):**
| Kolom | |
|-------|-|
| Project ID | |
| Total PO | |
| Full Received | |

---

### 4.8 PO List — Tab "Daftar Harga Satuan"

Master harga satuan per item, diinput manual oleh Procurement.

**Table Columns:**
| Kolom | Field |
|-------|-------|
| No | auto |
| Description | `SupplierPrice.description` |
| Part Number | `SupplierPrice.partNumber` |
| Supplier | `SupplierPrice.supplierName` |
| Unit | `SupplierPrice.unit` |
| Unit Price | `SupplierPrice.unitPrice` |
| Currency | `SupplierPrice.currency` |
| Last Updated | |

---

## 5. Schema Database

### 5.1 Enum Baru

```prisma
enum POHealth {
  ON_TRACK    // > 14 hari dari delivery target
  WARNING     // 7–14 hari
  CRITICAL    // 0–7 hari
  LATE        // Sudah lewat, belum received
  RECEIVED    // Semua item sudah Mat In
}

enum POStatus {
  DRAFT           // Belum released ke supplier
  RELEASED        // Sudah dikirim ke supplier
  PARTIAL_RECEIVED // Sebagian item sudah Mat In
  FULL_RECEIVED   // Semua item sudah Mat In
  CANCELLED       // Dibatalkan
}

enum BorrowStatus {
  BORROWED   // Sedang dipinjam
  RETURNED   // Sudah dikembalikan
}
```

### 5.2 Model PurchaseOrder

```prisma
model PurchaseOrder {
  id              String     @id @default(cuid())
  poNumber        String     @unique  // "001/2499/Elsicom" — auto tapi editable

  // Project
  projectId       String
  projectCode     String

  // Supplier & Terms
  supplierName    String
  termOfPayment   String?
  deliveryTime    DateTime   // Target delivery date
  poDate          DateTime   @default(now())

  // Status
  status          POStatus   @default(RELEASED)
  poHealth        POHealth   @default(ON_TRACK)  // Auto-calculated on fetch

  // Financial
  totalAmount     Decimal?   @db.Decimal(15, 2)
  currency        String     @default("IDR")

  // Source: bisa dari MR atau manual
  materialRequestId String?
  materialRequest   MaterialRequest? @relation("POFromMR", fields: [materialRequestId], references: [id])

  // Relations
  items           POItem[]
  invoices        POInvoice[]

  // Audit
  createdBy       String
  creator         User       @relation("POCreatedBy", fields: [createdBy], references: [id])
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([projectCode])
  @@index([poHealth])
  @@index([status])
}
```

### 5.3 Model POItem

```prisma
model POItem {
  id              String        @id @default(cuid())
  poId            String
  po              PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)

  // Item detail
  description     String
  partNumber      String?
  qty             Int
  unit            String
  unitPrice       Decimal?      @db.Decimal(15, 2)
  totalPrice      Decimal?      @db.Decimal(15, 2) // qty * unitPrice

  // PR Tracking (Purchase Requisition info)
  prNo            String?       // No Urut PR
  prDate          DateTime?     // Tgl Purchase Requisition
  prProcessDate   DateTime?     // Tgl Total PR Process

  // Receiving
  matIn           DateTime?     // Tanggal item diterima di gudang (input by Warehouse/Procurement)
  receivedQty     Int?          // Qty yang sudah diterima (untuk partial receive)

  // WR linkage (optional: item ini akan di-WR ke project)
  warehouseReleaseId String?

  // Source: dari MR item atau manual
  mrItemId        Int?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([poId])
}
```

### 5.4 Model POInvoice

```prisma
model POInvoice {
  id              String        @id @default(cuid())
  poId            String
  po              PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)

  invoiceNo       String        // Nomor invoice dari supplier
  invoiceDate     DateTime?
  amount          Decimal?      @db.Decimal(15, 2)
  isPaid          Boolean       @default(false)
  paidAt          DateTime?
  notes           String?

  createdAt       DateTime @default(now())

  @@index([poId])
}
```

### 5.5 Model BorrowedItem

```prisma
model BorrowedItem {
  id              String      @id @default(cuid())
  docNo           String      @unique  // BR-2026-XXXX

  // Inter-project
  fromProjectId   String      // Project yang memiliki item (sumber)
  fromProjectName String?
  toProjectId     String      // Project yang meminjam (penerima)
  toProjectName   String?

  // Item detail
  description     String
  partNumber      String?
  qty             Int
  unit            String

  // Timeline
  borrowDate      DateTime    @default(now())
  dueDate         DateTime?   // Target pengembalian

  // Status
  status          BorrowStatus @default(BORROWED)
  returnedAt      DateTime?
  returnNotes     String?

  // Who processed
  processedBy     String
  processor       User        @relation("BorrowedProcessedBy", fields: [processedBy], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([fromProjectId])
  @@index([toProjectId])
  @@index([status])
}
```

### 5.6 Model ProjectBudget

```prisma
model ProjectBudget {
  id          String   @id @default(cuid())
  projectId   String
  year        Int
  budget      Decimal  @db.Decimal(15, 2)
  currency    String   @default("IDR")

  inputBy     String
  inputter    User     @relation("BudgetInputBy", fields: [inputBy], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([projectId, year])
  @@index([year])
}
```

### 5.7 Model SupplierPrice (Daftar Harga Satuan)

```prisma
model SupplierPrice {
  id              String   @id @default(cuid())
  supplierName    String
  description     String
  partNumber      String?
  unit            String
  unitPrice       Decimal  @db.Decimal(15, 2)
  currency        String   @default("IDR")
  notes           String?

  inputBy         String
  inputter        User     @relation("SupplierPriceInputBy", fields: [inputBy], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([supplierName])
}
```

### 5.8 Update User Model (tambah inverse relations)

```prisma
model User {
  // ... existing relations (JANGAN DIUBAH) ...

  // TAMBAH:
  purchaseOrders    PurchaseOrder[] @relation("POCreatedBy")
  borrowedProcessed BorrowedItem[]  @relation("BorrowedProcessedBy")
  projectBudgets    ProjectBudget[] @relation("BudgetInputBy")
  supplierPrices    SupplierPrice[] @relation("SupplierPriceInputBy")
}
```

### 5.9 Update MaterialRequest (optional link ke PO)

```prisma
model MaterialRequest {
  // ... existing fields ...
  
  // TAMBAH (optional):
  purchaseOrders  PurchaseOrder[] @relation("POFromMR")
}
```

---

## 6. Integration Existing System

### Yang Berubah/Diperluas
| Existing | Perubahan | Impact |
|----------|-----------|--------|
| `MR status APPROVED` | Muncul di dashboard Procurement sebagai "not processed" | Read only, no change |
| `WR status APPROVED` | Muncul di WR Plan tab | Read only, no change |
| `FR approvalStatus APPROVED` | Muncul di Fault Report tab | Read only, no change |
| `MR status PROCUREMENT_PROCESS` | Di-update saat Procurement buat PO dari MR | `MR.status` update |

### Yang TIDAK Berubah
```
✅ BoM flow → tetap pakai /procurement/bom/** (separate)
✅ Engineer MR/WR/FR create & approval flow → tidak tersentuh
✅ PM approval pages → tidak tersentuh
✅ app/actions/procurement.js → tidak tersentuh (BoM pricing)
```

---

## 7. Phase Implementation Plan

### Phase A — Schema & Migration ✅ *SELESAI*
**Estimasi: 1–2 jam**

| No | Pekerjaan | File |
|----|-----------|------|
| A.1 | Tambah enum `POHealth`, `POStatus`, `BorrowStatus` | `prisma/schema.prisma` |
| A.2 | Model `PurchaseOrder` | `prisma/schema.prisma` |
| A.3 | Model `POItem` | `prisma/schema.prisma` |
| A.4 | Model `POInvoice` | `prisma/schema.prisma` |
| A.5 | Model `BorrowedItem` | `prisma/schema.prisma` |
| A.6 | Model `ProjectBudget` | `prisma/schema.prisma` |
| A.7 | Model `SupplierPrice` | `prisma/schema.prisma` |
| A.8 | Update `User` model (inverse relations) | `prisma/schema.prisma` |
| A.9 | Update `MaterialRequest` (tambah `purchaseOrders` relation) | `prisma/schema.prisma` |
| A.10 | `prisma db push` + `prisma generate` | Terminal |

---

### Phase B — Server Actions
**Estimasi: 3–4 jam**

**File: `app/actions/purchase-order.js`** (BARU)
| Fungsi | Keterangan |
|--------|-----------|
| `generatePONumber(projectCode)` | Auto-generate: `001/2499/Elsicom` per project |
| `createPurchaseOrder(data)` | Buat PO baru, bisa dari MR atau manual |
| `getPurchaseOrders(filters)` | Get all POs dengan filter year/project/health |
| `getPurchaseOrderById(id)` | Detail PO + items + invoices |
| `updatePOItem(itemId, data)` | Update item (termasuk Mat In date) |
| `markItemReceived(itemId, matInDate)` | Input tanggal Mat In |
| `addInvoice(poId, invoiceData)` | Tambah invoice ke PO |
| `updateInvoice(invoiceId, data)` | Update invoice |
| `calculatePOHealth(po)` | Helper: hitung health dari dates |

**File: `app/actions/procurement-dashboard.js`** (BARU)
| Fungsi | Keterangan |
|--------|-----------|
| `getDashboardStats(filters)` | MR/WR/FR not processed + PO stats |
| `getFinancialStats(year, projectId)` | Budget vs Spending |
| `getOrdersRequiringAttention()` | Late/Critical/Warning POs |
| `getProjectSummary()` | Total PO + Full Received per project |

**File: `app/actions/borrowed-item.js`** (BARU)
| Fungsi | Keterangan |
|--------|-----------|
| `createBorrowedItem(data)` | Buat record peminjaman |
| `getBorrowedItems(filters)` | Get list dengan filter |
| `markAsReturned(id, notes)` | Update status → RETURNED |

**File: `app/actions/supplier-price.js`** (BARU)
| Fungsi | Keterangan |
|--------|-----------|
| `createSupplierPrice(data)` | Input harga baru |
| `getSupplierPrices(filters)` | Get list dengan filter |
| `updateSupplierPrice(id, data)` | Update harga |
| `deleteSupplierPrice(id)` | Hapus entry |

**File: `app/actions/project-budget.js`** (BARU)
| Fungsi | Keterangan |
|--------|-----------|
| `upsertProjectBudget(projectId, year, budget)` | Create/update budget |
| `getProjectBudgets(filters)` | Get all budgets |

---

### Phase C — Layout Redesign
**Estimasi: 1 jam**

Redesign `app/procurement/layout.js`:
- Ganti dari header-nav → dark sidebar (sesuai Figma design)
- Elsicom logo di sidebar
- Nav items: Dashboard, PO Plan, PO List, Finances (disabled), Back Office (disabled)
- Highlight active route

---

### Phase D — UI Pages
**Estimasi: 5–7 jam**

| No | File | URL | Keterangan |
|----|------|-----|-----------|
| D.1 | `app/procurement/page.js` (UPDATE) | `/procurement` | Full redesign: 3 stat cards + charts |
| D.2 | `app/procurement/po-plan/page.js` (BARU) | `/procurement/po-plan` | PO Plan tabs |
| D.3 | `app/procurement/po-plan/create/page.js` (BARU) | `/procurement/po-plan/create` | Form buat PO baru |
| D.4 | `app/procurement/po-list/page.js` (BARU) | `/procurement/po-list` | PO List tabs |
| D.5 | `app/procurement/po-list/[poId]/page.js` (BARU) | `/procurement/po-list/[poId]` | Detail PO + invoice management |

**Client Components (BARU):**
| File | Fungsi |
|------|--------|
| `app/procurement/po-plan/POPlanTable.js` | Spreadsheet table + inline edit |
| `app/procurement/po-plan/WRPlanTable.js` | WR Plan tab content |
| `app/procurement/po-plan/FaultReportTable.js` | FR tab content |
| `app/procurement/po-plan/BorrowedTable.js` | Borrowed tab + create modal |
| `app/procurement/po-list/POListTable.js` | PO List spreadsheet + color coding |
| `app/procurement/po-list/InvoiceManager.js` | Add/edit/view invoices |
| `app/procurement/po-list/SupplierPriceTable.js` | Daftar Harga Satuan |
| `app/procurement/DashboardCharts.js` | Bar chart budget vs spending (Recharts) |

---

### Phase E — Advanced Features
**Estimasi: 2–3 jam**

| No | Fitur |
|----|-------|
| E.1 | Auto-refresh PO Health (hitung ulang saat halaman load) |
| E.2 | Column filter dropdown (per kolom) di tabel spreadsheet |
| E.3 | Inline edit Mat In date di PO Plan table |
| E.4 | "Mark as Returned" action di Borrowed tab |
| E.5 | Invoice inline add (tanpa pindah halaman) |
| E.6 | Export Excel untuk PO List (nice to have) |

---

## 8. Files Map

### Files BARU yang akan dibuat
```
prisma/schema.prisma                          → UPDATE (tambah 6 model + enums)

app/actions/purchase-order.js                 → BARU
app/actions/procurement-dashboard.js          → BARU
app/actions/borrowed-item.js                  → BARU
app/actions/supplier-price.js                 → BARU
app/actions/project-budget.js                 → BARU

app/procurement/layout.js                     → UPDATE (dark sidebar)
app/procurement/page.js                       → UPDATE (full redesign)
app/procurement/DashboardCharts.js            → BARU (client component)

app/procurement/po-plan/page.js               → BARU
app/procurement/po-plan/create/page.js        → BARU
app/procurement/po-plan/POPlanTable.js        → BARU
app/procurement/po-plan/WRPlanTable.js        → BARU
app/procurement/po-plan/FaultReportTable.js   → BARU
app/procurement/po-plan/BorrowedTable.js      → BARU

app/procurement/po-list/page.js               → BARU
app/procurement/po-list/[poId]/page.js        → BARU
app/procurement/po-list/POListTable.js        → BARU
app/procurement/po-list/InvoiceManager.js     → BARU
app/procurement/po-list/SupplierPriceTable.js → BARU
```

### Files TIDAK BOLEH DIUBAH
```
app/procurement/bom/**                        → BoM pricing (existing, tetap)
app/actions/procurement.js                    → BoM actions (existing, tetap)
```

---

## 9. Summary Estimasi Total

| Phase | Deskripsi | Estimasi |
|-------|-----------|---------|
| A | Schema + Migration | 1–2 jam |
| B | Server Actions (5 files) | 3–4 jam |
| C | Layout Redesign | 1 jam |
| D | UI Pages (5 pages + 8 components) | 5–7 jam |
| E | Advanced Features | 2–3 jam |
| **TOTAL** | | **~12–17 jam** |

---

## 10. Dependencies Eksternal

Chart library yang perlu di-install:
```bash
npm install recharts
```
(Untuk bar chart Budget vs Spending di Dashboard)

> Atau gunakan chart library yang sudah ada di project jika ada.
