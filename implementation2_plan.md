# Master Blueprint: ERP E-Procurement System (Contractor Engineering)

## 1. Project Overview
Aplikasi ERP ini berfungsi sebagai jembatan operasional antara tim Engineer, WPO, Procurement, Finance, dan Gudang untuk mengelola siklus pengadaan barang di perusahaan kontraktor.

- **Framework:** Next.js 15 (App Router)
- **Standard:** Server Actions untuk mutasi data
- **Database:** MySQL dengan Prisma ORM
- **Styling:** Tailwind CSS (Dark Mode: `#FFC107` branding)
- **Deployment:** Target cPanel Shared Hosting

---

## 2. Role & Workflow Definition
Sistem wajib mengunci akses berdasarkan role (RBAC):

1. **Engineer:** Create Material Request (MR), Cek Stok, Create Request Pengeluaran Barang.
2. **WPO:** Approval MR & Approval Pengeluaran Barang.
3. **Procurement:** Konversi MR (Approved) menjadi Purchase Order (PO) & Manajemen Vendor.
4. **Finance:** Budget Clearance & Approval Pembayaran PO.
5. **Admin Gudang:** Update Stok (Barang Masuk), Generate Surat Jalan (Barang Keluar).

---

## 3. Integrated Database Schema (Prisma)
Gunakan skema ini sebagai *Single Source of Truth*.

```prisma
enum Role {
  ENGINEER
  WPO
  PROCUREMENT
  FINANCE
  WAREHOUSE
}

enum Status {
  WAITING_WPO
  WPO_APPROVED
  PROCUREMENT_PROCESS
  FINANCE_PAID
  AVAILABLE_IN_WAREHOUSE
  SHIPPED
  REJECTED
}

model User {
  id       String @id @default(cuid())
  name     String
  email    String @unique
  role     Role   @default(ENGINEER)
}

model MaterialRequest {
  id              String   @id @default(cuid()) 
  docControlNo    String   @unique // Format: MR-2026-XXXX
  projectId       String
  projectName     String
  workPackage     String?
  keterangan      String?
  status          Status   @default(WAITING_WPO)
  
  items           MaterialRequestItem[]
  suratJalan      SuratJalan[]

  requestedBy     String   // User ID
  wpoApprovedBy   String?  // User ID
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model MaterialRequestItem {
  id                    Int      @id @default(autoincrement())
  materialRequestId     String
  request               MaterialRequest @relation(fields: [materialRequestId], references: [id], onDelete: Cascade)
  
  description           String
  elsicomPartNum        String?
  manufacturePartNum    String?
  qty                   Int
  unit                  String
  targetDate            DateTime?
  remarks               String?
}

model Inventory {
  id          String @id @default(cuid())
  itemName    String
  sku         String @unique
  stockQty    Int    @default(0)
  unit        String
}

model SuratJalan {
  id                String   @id @default(cuid())
  materialRequestId String
  request           MaterialRequest @relation(fields: [materialRequestId], references: [id])
  driverName        String
  vehiclePlate      String
  issuedAt          DateTime @default(now())
}



4. Implementation Strategy (Phase-by-Phase)
Phase 1: Engineer Interface & MR Logic
Refactor Form: Gunakan react-hook-form dengan useFieldArray untuk tabel MR gaya Excel.

Server Action: Implementasikan createMaterialRequest di app/actions/material-request.js.

Validation: Pastikan docControlNo ter-generate otomatis (Format: MR-YYYY-000X).

Excel Feature: Tambahkan library xlsx untuk fitur "Upload Excel to Populate Table".

Phase 2: WPO & Procurement Bridge
Approval System: Buat Server Action approveRequestWPO(mrId) yang mengubah status ke WPO_APPROVED.

PO Generation: Procurement dapat melihat daftar MR yang sudah di-approve untuk diproses ke vendor.

Phase 3: Finance & Inventory
Finance Action: Tombol "Confirm Payment" untuk mengubah status barang menjadi siap dibeli/diambil.

Inventory Sync: Saat Procurement menandai barang "Received", stok di tabel Inventory harus bertambah otomatis.

Phase 4: Warehouse & Logistics
Release Request: Engineer meminta pengeluaran barang yang sudah AVAILABLE_IN_WAREHOUSE.

Surat Jalan: Admin Gudang menekan "Generate Surat Jalan", memicu pengurangan stok di Inventory dan mencetak PDF (menggunakan jspdf).

5. Coding Standards & Constraints
Modularity: Pecah komponen besar menjadi atomik (e.g., <MRTable />, <StatusBadge />).

State Management: Gunakan React State (useState) atau react-hook-form untuk input dinamis. Jangan biarkan input tidak terkontrol dalam loop.

Fetching: Gunakan React Server Components (RSC) untuk fetching data di dashboard.

Error Handling: Gunakan try-catch di dalam Server Actions dan tampilkan toast notifikasi ke user.

Dark Mode: Wajib menyertakan utility class dark: pada setiap komponen UI baru.

6. Verification Checklist
[ ] Form MR bisa menambah/menghapus baris tanpa kehilangan fokus.

[ ] Data tersimpan di MySQL dengan relasi Parent-Child (MR -> Items) yang benar.

[ ] Role ENGINEER tidak bisa mengakses dashboard FINANCE.

[ ] Surat Jalan berhasil mengurangi angka di tabel Inventory.