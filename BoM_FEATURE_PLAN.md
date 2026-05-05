# 📋 Planning: BoM (Bill of Material) Feature Implementation

**Tanggal**: Mei 2026  
**Status**: Planning Phase  
**Scope**: Tambahan modul BoM dengan role-based permissions

---

## 📌 EXECUTIVE SUMMARY

Menambahkan sistem **BoM (Bill of Material)** yang memungkinkan:
- **Marketing**: Membuat tabel BoM master per project
- **Engineer (3 sub-roles)**: Merinci dan approve BoM dengan quantity
- **Procurement**: Menambah harga tanpa bisa hapus/ubah BoM
- **Permission-based UI**: Setiap role hanya melihat & melakukan aksi yang diizinkan

---

## 🏗️ SECTION 1: DATABASE SCHEMA UPDATES

### 1.1 Update Enum Roles di Prisma

```prisma
enum Role {
  ENGINEER           // Parent role (akan expand ke sub-roles)
  PROCUREMENT
  MARKETING
  WPO               // Keep untuk backward compatibility
  PROJECT_MANAGER   // Keep untuk backward compatibility
  FINANCE
  WAREHOUSE
}

enum EngineerRole {
  STAFF             // Engineer Staff - bisa rinci BoM
  WPO              // Engineer WPO - approval 1
  SYSTEM           // Engineer System - approval 2
}

enum BomStatus {
  DRAFT            // Marketing membuat draft
  SUBMITTED        // Engineer staff submit untuk approval
  WPO_APPROVED     // Engineer WPO approved
  SYSTEM_APPROVED  // Engineer System approved (final)
  REJECTED         // Rejected oleh WPO atau System
  ACTIVE          // Ready for procurement
  ARCHIVED        // Bom lama yang tidak dipakai
}

enum BomItemStatus {
  PENDING          // Menunggu engineer staff rinci
  REFINED          // Engineer staff sudah rinci
  APPROVED         // WPO & System sudah approve
  REJECTED         // Ditolak di approval stage
  PRICED           // Procurement sudah kasih harga
}
```

### 1.2 New Models - Bill of Material (BoM)

```prisma
model BillOfMaterial {
  id                  String   @id @default(cuid())
  bomNo              String   @unique          // Format: BOM-2026-XXXX (auto-generated)
  
  // Project Reference
  projectId          String
  projectName        String
  projectCode        String                    // Contoh: "2244"
  contractNo         String?
  
  // Metadata
  bomStatus          BomStatus @default(DRAFT)
  description        String?   @db.Text        // Deskripsi BoM
  
  // Ownership & Approval
  createdBy          String                    // Marketing user ID
  creator            User      @relation("BomCreatedBy", fields: [createdBy], references: [id])
  
  submittedBy        String?                   // Engineer Staff user ID (saat submit)
  submitter          User?     @relation("BomSubmittedBy", fields: [submittedBy], references: [id])
  
  wpoApprovedBy      String?                   // Engineer WPO user ID
  wpoApprover        User?     @relation("BomWpoApprovedBy", fields: [wpoApprovedBy], references: [id])
  wpoApprovedAt      DateTime?
  wpoRemarks         String?
  
  systemApprovedBy   String?                   // Engineer System user ID
  systemApprover     User?     @relation("BomSystemApprovedBy", fields: [systemApprovedBy], references: [id])
  systemApprovedAt   DateTime?
  systemRemarks      String?
  
  // Items dalam BoM
  items              BomItem[]
  
  // Timeline
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  submittedAt        DateTime?
  
  @@index([projectId])
  @@index([bomStatus])
}

model BomItem {
  id                 String   @id @default(cuid())
  bomId              String
  bom                BillOfMaterial @relation(fields: [bomId], references: [id], onDelete: Cascade)
  
  // Marketing baseline (dari kontrak)
  marketingDesc      String                    // Deskripsi dari kontrak
  marketingQty       Int?                      // Qty dari kontrak (optional)
  marketingUnit      String?                   // Unit dari kontrak (optional)
  
  // Engineer rincian (oleh Engineer Staff)
  itemStatus         BomItemStatus @default(PENDING)
  refinedDesc        String?                   // Deskripsi lebih detail dari engineer
  refinedQty         Int?                      // Qty yang diminta engineer
  refinedUnit        String?
  notes              String?   @db.Text        // Catatan dari engineer
  
  // Procurement pricing
  unitPrice          Decimal?  @db.Decimal(15, 2)
  totalPrice         Decimal?  @db.Decimal(15, 2) // refinedQty * unitPrice
  currency           String?   @default("IDR")
  supplier           String?
  leadTime           Int?                      // Hari
  
  // Approval tracking
  rejectionReason    String?                   // Alasan jika rejected
  
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  @@index([bomId])
  @@index([itemStatus])
}

model BomHistory {
  id                String   @id @default(cuid())
  bomId             String
  bom               BillOfMaterial @relation(fields: [bomId], references: [id], onDelete: Cascade)
  
  action            String    // "CREATED", "SUBMITTED", "APPROVED", "REJECTED", "ITEM_ADDED", etc.
  performedBy       String
  user              User      @relation(fields: [performedBy], references: [id])
  
  details           String?   @db.Text
  previousData      String?   @db.Text        // JSON snapshot sebelum perubahan
  newData           String?   @db.Text        // JSON snapshot sesudah perubahan
  
  timestamp         DateTime @default(now())
  
  @@index([bomId])
}
```

### 1.3 Update User Model

```prisma
model User {
  id                String   @id @default(cuid())
  username          String   @unique
  password          String
  name              String
  
  // Role structure
  role              Role
  engineerRole      EngineerRole?             // Only populated jika role = ENGINEER
  
  // Existing fields
  position          String?
  createdAt         DateTime @default(now())

  // Relations - BoM specific
  bomsCreated       BillOfMaterial[] @relation("BomCreatedBy")
  bomsSubmitted     BillOfMaterial[] @relation("BomSubmittedBy")
  bomsWpoApproved   BillOfMaterial[] @relation("BomWpoApprovedBy")
  bomsSystemApproved BillOfMaterial[] @relation("BomSystemApprovedBy")
  
  // Existing relations
  materialRequests  MaterialRequest[] @relation("RequestedBy")
  pmApprovals       MaterialRequest[] @relation("PMApprovedBy")
  wpoApprovals      MaterialRequest[] @relation("WPOApprovedBy")
  faultReports      FaultReport[]
  warehouseReleases WarehouseRelease[]
  
  // Audit trail
  bomHistories      BomHistory[]
}
```

### 1.4 Migration Notes

```sql
-- Update prisma/schema.prisma with above changes
-- Run: npx prisma migrate dev --name add_bom_models
-- This will:
--   1. Add enum BomStatus, BomItemStatus, EngineerRole
--   2. Create tables: BillOfMaterial, BomItem, BomHistory
--   3. Add engineerRole column to User table
--   4. Create foreign key relationships
```

---

## 🎭 SECTION 2: ROLE & PERMISSION MATRIX

### 2.1 Role Hierarchy

```
ENGINEER (Parent Role)
├── ENGINEER_STAFF        → Bisa rinci BoM, submit approval, lihat harga
├── ENGINEER_WPO          → Approval tahap 1, lihat harga
└── ENGINEER_SYSTEM       → Approval tahap 2, lihat harga

MARKETING                 → Buat & edit BoM master, tidak bisa lihat harga

PROCUREMENT              → Lihat BoM approved, tambah harga, tidak bisa delete

PROJECT_MANAGER          → Dashboard PM approval (existing)
WPO                      → Warehouse approval (existing)
FINANCE                  → Finance tracking (future)
WAREHOUSE                → Inventory (existing)
```

### 2.2 Permission Matrix

| Action | Marketing | Engineer Staff | Engineer WPO | Engineer System | Procurement |
|--------|-----------|-----------------|--------------|-----------------|------------|
| **Buat BoM Draft** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Edit BoM (status DRAFT)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Lihat BoM** | ✅ (Own) | ✅ (Active) | ✅ | ✅ | ✅ (Active) |
| **Delete BoM** | ✅ (Draft) | ❌ | ❌ | ❌ | ❌ |
| **Lihat marketing items** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Rinci BoM item** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Submit BoM approval** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Approve (WPO)** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Approve (System)** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Reject BoM** | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Lihat harga** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Tambah/Edit harga** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Delete item/harga** | ✅ (Draft) | ❌ | ❌ | ❌ | ❌ |

---

## 📂 SECTION 3: FILE STRUCTURE

```
app/
├── actions/
│   ├── bom.js                          ← Server Actions untuk BoM
│   └── bom-item.js                     ← Server Actions untuk BoM Item
│
├── components/
│   └── bom/
│       ├── BomHeader.js                ← Header dengan status badge
│       ├── BomItemTable.js             ← Dynamic table rendering
│       ├── BomApprovalSection.js       ← Approval buttons (conditional)
│       ├── BomPriceSection.js          ← Pricing section
│       └── BomStatusTimeline.js        ← Status tracking timeline
│
├── lib/
│   ├── permissions.js                  ← Permission checker helper
│   └── bom-utils.js                    ← BoM utility functions
│
├── marketing/                           ← NEW: Marketing module
│   ├── layout.js
│   ├── page.js                         ← Dashboard Marketing
│   ├── bom/
│   │   ├── page.js                     ← List BoM
│   │   ├── create/page.js              ← Create BoM form
│   │   └── [bomId]/
│   │       ├── page.js                 ← Detail & edit BoM
│   │       └── layout.js
│   │
│   └── projects/                       ← Reference untuk projects
│
├── engineer/
│   ├── bom/                            ← NEW: Engineer BoM section
│   │   ├── page.js                     ← List BoM to refine
│   │   └── [bomId]/
│   │       ├── refine/page.js          ← Refine BoM items
│   │       ├── approve/page.js         ← Approve BoM (WPO/System)
│   │       └── view/page.js            ← View detail
│   │
│   └── ...existing files...
│
├── procurement/                        ← NEW: Procurement module
│   ├── layout.js
│   ├── page.js                         ← Dashboard Procurement
│   ├── bom/
│   │   ├── page.js                     ← List BoM to price
│   │   └── [bomId]/
│   │       ├── pricing/page.js         ← Add/edit prices
│   │       └── view/page.js            ← View BoM with prices
│   │
│   └── ...existing files...
│
└── api/
    └── bom/                            ← NEW: API routes (if needed)
        ├── route.js
        └── [bomId]/route.js
```

---

## 🔄 SECTION 4: WORKFLOW & USER JOURNEYS

### 4.1 Happy Path: Complete BoM Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        MARKETING STAFF                          │
│  1. Buat BoM baru untuk project 2244                            │
│  2. Masukkan items dari kontrak (baseline)                      │
│  3. Save as DRAFT                                               │
│  4. Submit untuk engineer rincian                               │
│  Status: DRAFT → SUBMITTED                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ENGINEER STAFF                               │
│  1. Lihat BoM SUBMITTED                                         │
│  2. Untuk setiap item:                                          │
│     - Review deskripsi marketing                                │
│     - Input qty yang dibutuhkan (refinedQty)                    │
│     - Tambah detail/catatan teknis                              │
│  3. Submit untuk approval                                       │
│  Status per item: PENDING → REFINED                             │
│  Status BoM: SUBMITTED → SUBMITTED_FOR_APPROVAL                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  ENGINEER WPO (Approval 1)                      │
│  1. Review refined items                                        │
│  2. Approve atau reject dengan remarks                          │
│  Status: WPO_APPROVED atau REJECTED                             │
│  Jika rejected → kembali ke engineer staff                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (jika WPO approve)
┌─────────────────────────────────────────────────────────────────┐
│              ENGINEER SYSTEM (Approval 2)                       │
│  1. Final check & approval                                      │
│  Status: SYSTEM_APPROVED (atau REJECTED)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PROCUREMENT STAFF                            │
│  1. Lihat BoM SYSTEM_APPROVED                                   │
│  2. Untuk setiap item:                                          │
│     - Input unit price (dari supplier quotes)                   │
│     - Select supplier                                           │
│     - Add lead time info                                        │
│  3. Total price auto-calculated (refinedQty × unitPrice)        │
│  Status per item: APPROVED → PRICED                             │
│  Status BoM: SYSTEM_APPROVED → ACTIVE                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    BoM Ready untuk Procurement
                    (Generate PO, MR, etc.)
```

### 4.2 UI Per Role

**Marketing Dashboard:**
- Button: [+ Create BoM] [Filter] [Search]
- Table: BOM No | Project | Status | Items Count | Created | Actions (View, Edit, Delete Draft, Archive)
- Detail Page: Form untuk edit BoM master, tabel items (marketing_desc, marketing_qty, status)

**Engineer Staff Dashboard:**
- Button: [Filter by Status]
- Table: BOM No | Project | Engineer Review Status | Last Updated | Actions (Refine, View)
- Refine Page: 
  - Read-only: Marketing items (marketing_desc, marketing_qty)
  - Editable: refinedDesc, refinedQty, refinedUnit, notes
  - Submit button (setelah semua item di-rinci)

**Engineer WPO Dashboard:**
- Button: [Filter: Pending, Approved, Rejected]
- Table: BOM No | Project | Status | SubmittedBy | Date | Actions (Approve, Reject, View)
- Approval Page: Detail tabel, field remarks, [Approve] [Reject] buttons

**Engineer System Dashboard:**
- Similar ke WPO tapi untuk final approval

**Procurement Dashboard:**
- Button: [Filter by Pricing Status]
- Table: BOM No | Project | Total Items | Priced Items | Total Cost | Actions (Price, View)
- Pricing Page: Tabel dengan refined items, editable price fields, supplier, lead time

---

## 💾 SECTION 5: SERVER ACTIONS (app/actions/bom.js)

### 5.1 BoM Master Actions

```javascript
// Create
export async function createBom(formData)
  → Validate permission: MARKETING only
  → Generate bomNo (BOM-2026-XXXX)
  → Save to DB with status DRAFT
  → Return { success, bomId, message }

// Update (Draft)
export async function updateBom(bomId, data)
  → Validate: Creator can edit if status DRAFT
  → Update fields
  → Return { success, message }

// Delete (Draft only)
export async function deleteBom(bomId)
  → Validate: DRAFT status & permission
  → Delete bom & related items
  → Return { success, message }

// Submit for Refinement
export async function submitBomForRefinement(bomId)
  → Validate: DRAFT status & marketing user
  → Change status to SUBMITTED
  → Create BomHistory entry
  → Return { success, message }

// Approve (WPO & System)
export async function approveBom(bomId, engineerRole, remarks)
  → Validate: WPO or SYSTEM engineer role
  → Update status accordingly (WPO_APPROVED or SYSTEM_APPROVED)
  → Save remarks, approver info, timestamp
  → Create BomHistory
  → Return { success, message }

// Reject
export async function rejectBom(bomId, engineerRole, rejectionReason)
  → Validate: WPO or SYSTEM engineer role
  → Set status REJECTED
  → Save rejection reason
  → Create BomHistory with reason
  → Notify engineer staff
  → Return { success, message }

// Archive
export async function archiveBom(bomId)
  → Validate: MARKETING permission & ACTIVE status
  → Change status to ARCHIVED
  → Return { success, message }
```

### 5.2 BoM Item Actions (app/actions/bom-item.js)

```javascript
// Add Item (Marketing only, draft stage)
export async function addBomItem(bomId, itemData)
  → Validate: MARKETING & DRAFT status
  → Save item with itemStatus = PENDING
  → Return { success, itemId, message }

// Refine Item (Engineer Staff only)
export async function refineBomItem(itemId, refinedData)
  → Validate: ENGINEER_STAFF & parent BoM status allows
  → Update: refinedDesc, refinedQty, refinedUnit, notes
  → Set itemStatus = REFINED
  → Return { success, message }

// Add Price (Procurement only)
export async function addBomItemPrice(itemId, priceData)
  → Validate: PROCUREMENT & BoM status SYSTEM_APPROVED
  → Update: unitPrice, supplier, leadTime, currency
  → Auto-calculate totalPrice = refinedQty × unitPrice
  → Set itemStatus = PRICED
  → Return { success, message }

// Batch update prices
export async function updateBomPrices(bomId, pricesData[])
  → Validate: PROCUREMENT permission
  → Update multiple items with pricing
  → Return { success, pricedCount, totalCost }
```

### 5.3 Helper Function (lib/permissions.js)

```javascript
// Permission checker
export async function checkBomPermission(userId, bomId, action)
  → Get user role & engineerRole
  → Get bom status
  → Return { allowed: boolean, reason: string }

// Example actions:
// "create" → MARKETING only
// "refine_item" → ENGINEER_STAFF & BoM not REJECTED/ARCHIVED
// "approve_wpo" → ENGINEER_WPO & BoM in SUBMITTED status
// "approve_system" → ENGINEER_SYSTEM & BoM in WPO_APPROVED
// "price_item" → PROCUREMENT & BoM in SYSTEM_APPROVED
```

---

## 🎨 SECTION 6: UI COMPONENTS

### 6.1 BomHeader Component

```javascript
// Shows: BoM No, Project, Status Badge, Timeline
// Conditionally render action buttons based on:
//   - User role
//   - Current BoM status
//   - Item completion percentage

Props:
  - bom: BillOfMaterial object
  - userRole: string
  - userEngineerRole: string (if ENGINEER)
  - onApprove: function
  - onReject: function
  - onRefine: function
  - onPrice: function
```

### 6.2 BomItemTable Component

```javascript
// Dynamic table rendering based on context (view/edit/approve/price)
// Columns change based on role:

MARKETING VIEW:
  - Item # | Marketing Desc | Qty | Unit | Status | Edit | Delete

ENGINEER STAFF REFINE:
  - Item # | Marketing Desc | Qty | Refined Desc | Refined Qty | Notes | Edit

ENGINEER APPROVAL:
  - Item # | Description | Qty | Refined By | Status | Remarks | [Approve/Reject]

PROCUREMENT PRICING:
  - Item # | Desc | Qty | Unit Price | Supplier | Lead Time | Total | Edit

Props:
  - bomItems: BomItem[]
  - viewMode: "view" | "refine" | "approve" | "price"
  - onUpdate: function
  - onDelete: function
```

### 6.3 BomStatusTimeline Component

```javascript
// Visual timeline showing:
// Marketing → Engineer → WPO Approval → System Approval → Pricing → Active

Shows:
  - Status badges
  - Timestamps
  - Approver names
  - Rejection reasons (if any)
  - Remarks from each stage
```

### 6.4 BomApprovalSection Component

```javascript
// Conditional rendering untuk approval actions
// Hanya muncul jika:
//   - User role punya permission approve di stage ini
//   - BoM status memungkinkan approval

Shows:
  - Reviewer remarks textarea
  - [Approve] [Reject] buttons
  - Confirmation dialog sebelum submit
```

---

## 📊 SECTION 7: DATABASE QUERIES (Useful for future implementation)

```javascript
// Get all BoMs for Marketing user
prisma.billOfMaterial.findMany({
  where: { createdBy: userId },
  include: { items: true }
})

// Get BoMs pending engineer refinement
prisma.billOfMaterial.findMany({
  where: { bomStatus: "SUBMITTED" },
  include: { items: true }
})

// Get system-approved BoMs ready for pricing
prisma.billOfMaterial.findMany({
  where: { bomStatus: "SYSTEM_APPROVED" },
  include: { items: { where: { itemStatus: "APPROVED" } } }
})

// Calculate total BoM cost
const bom = await prisma.billOfMaterial.findUnique({
  where: { id: bomId },
  include: { items: true }
})
const totalCost = bom.items.reduce((sum, item) => 
  sum + (item.totalPrice || 0), 0
)
```

---

## 🧪 SECTION 8: TESTING STRATEGY

### 8.1 Unit Test Cases

```javascript
// Permission tests
✓ Marketing user can create BoM
✓ Engineer staff cannot create BoM
✓ Engineer staff can refine items
✓ Procurement cannot delete items
✓ Procurement can add prices
✓ Engineer cannot see prices

// Workflow tests
✓ Draft → Submitted transition works
✓ Rejected BoM can be re-submitted
✓ All items refined → can submit
✓ Can approve only after all items refined
✓ Total price calculated correctly

// Validation tests
✓ BoM No is unique
✓ Project ID must exist
✓ Quantities are positive integers
✓ Prices are positive decimals
✓ Rejection requires remarks
```

### 8.2 Integration Test Cases

```javascript
// End-to-end flows
✓ Complete BoM flow: Create → Refine → Approve → Price
✓ Reject at WPO stage → Engineer can re-submit
✓ Reject at System stage → Goes back to WPO
✓ Multiple BoMs for same project
✓ Archive old BoM doesn't affect active ones
```

### 8.3 Manual Testing Checklist

```
Marketing:
□ Can create BoM draft
□ Can edit BoM (draft only)
□ Can delete BoM (draft only)
□ Can submit for refinement
□ Cannot see prices
□ Cannot see engineer section

Engineer Staff:
□ Can view SUBMITTED BoMs
□ Can refine items (desc, qty, notes)
□ Can submit all refined
□ Cannot see prices
□ Cannot approve

Engineer WPO:
□ Can view SUBMITTED_FOR_APPROVAL BoMs
□ Can approve with remarks
□ Can reject with reason
□ Sees rejected items highlighted
□ Can see prices

Engineer System:
□ Can view WPO_APPROVED BoMs
□ Can do final approval
□ Can see all previous approvals
□ Can see prices

Procurement:
□ Can view SYSTEM_APPROVED BoMs
□ Can add prices to items
□ Cannot delete or modify BoM structure
□ Cannot see marketing baseline qty (only refined qty)
□ Total cost calculated correctly
```

---

## 📈 SECTION 9: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (1-2 weeks)
- [ ] Update Prisma schema (new models, enums)
- [ ] Database migration
- [ ] Create permission helper (lib/permissions.js)
- [ ] Update User model with engineerRole field
- [ ] Seed test data (marketing users, engineers, etc.)

### Phase 2: Marketing Module (1 week)
- [ ] Create `/marketing` folder structure
- [ ] Marketing dashboard page
- [ ] Create BoM form
- [ ] List BoMs with status
- [ ] Detail/edit BoM page
- [ ] BomHeader & BomItemTable components

### Phase 3: Engineer Module (2 weeks)
- [ ] Create `/engineer/bom` folder
- [ ] Engineer dashboard (list BoMs to refine/approve)
- [ ] Refine page (engineer staff)
- [ ] Approval pages (WPO & System)
- [ ] Server actions untuk refine & approve
- [ ] BomApprovalSection & BomStatusTimeline components
- [ ] Error handling & validation

### Phase 4: Procurement Module (1 week)
- [ ] Create `/procurement` folder structure
- [ ] Procurement dashboard
- [ ] Pricing page
- [ ] Server actions untuk add prices
- [ ] Price validation & total calculation
- [ ] BomPriceSection component

### Phase 5: Integration & Polish (1 week)
- [ ] Cross-role testing
- [ ] Permission matrix validation
- [ ] Notification system (future: email on status change)
- [ ] BoM history tracking & logging
- [ ] Export BoM to Excel (future)
- [ ] Performance optimization

### Phase 6: Advanced Features (Future)
- [ ] Bulk BoM upload from Excel template
- [ ] BoM comparison (versions)
- [ ] BoM approval workflows (workflow builder)
- [ ] Integration dengan Material Request
- [ ] Cost tracking & reporting
- [ ] Audit trail dashboards

---

## ⚠️ SECTION 10: CONSTRAINTS & CONSIDERATIONS

### 10.1 Business Rules

1. **BoM Master (Marketing)**
   - Tidak bisa diedit setelah SUBMITTED
   - Hanya bisa di-archive jika status ACTIVE
   - Marketing baseline qty bersifat informatif (dari kontrak)

2. **BoM Refinement (Engineer)**
   - Semua items harus dirinci sebelum submit
   - Qty harus ≥ 0
   - Cannot change marketing items structure
   - Engineering notes maksimal 500 karakter

3. **Approval Flow**
   - Harus sequential: WPO → System (tidak bisa skip)
   - Rejection goes back ke previous stage
   - System approval is final before pricing

4. **Pricing (Procurement)**
   - Hanya bisa setelah SYSTEM_APPROVED
   - Unit price & lead time required
   - Supplier selection from predefined list (future)
   - Total price = refined qty × unit price (locked)

### 10.2 Security & Validation

- [ ] Role verification di setiap endpoint
- [ ] Input sanitization (Zod schema validation)
- [ ] SQL injection prevention (Prisma handle)
- [ ] Unauthorized action logging
- [ ] Rate limiting untuk bulk operations
- [ ] Data encryption untuk sensitive pricing info (future)

### 10.3 Performance Notes

- Index on: projectId, bomStatus, itemStatus
- Pagination untuk BoM list (50 per page)
- Lazy load items dalam tabel besar
- Cache project list untuk dropdown
- Consider denormalization untuk cost reporting

### 10.4 Backward Compatibility

- Existing roles (WPO, PROJECT_MANAGER) unaffected
- New ENGINEER role expansion tidak break existing features
- MaterialRequest workflow continues as-is
- Can deprecate old engineer role gradually

---

## 📝 SECTION 11: ENVIRONMENT VARIABLES & CONFIG

```env
# .env.local (add to existing)

# BoM Feature
NEXT_PUBLIC_ENABLE_BOM_FEATURE=true
BOM_AUTO_GENERATE_NO=true           # Auto-generate BoM-2026-XXXX
BOM_APPROVAL_REQUIRED=true          # Enforce 2-level approval
BOM_PRICE_REQUIRED=true             # Require pricing before PO

# Notification settings (future)
NOTIFY_ON_BOM_SUBMIT=true
NOTIFY_ON_BOM_REJECT=true
```

---

## 🔗 SECTION 12: DEPENDENCY & INTEGRATION MAP

```
BoM Feature Dependencies:
├── Prisma (Database)
├── NextAuth (User roles)
├── React Hook Form (Forms)
├── Next.js Server Actions (Backend)
└── Tailwind CSS (Styling)

BoM Feature Integrations:
├── → MaterialRequest (link to BoM)
├── → Procurement Orders (generate from priced BoM)
├── → Inventory (reference to warehouse items)
└── → Reporting (cost analysis)

External Dependencies:
├── Excel import (XLSX library - already exist)
├── PDF export (future: jsPDF/pdfkit)
├── Email notifications (future: nodemailer)
└── File storage (future: AWS S3 / Vercel Blob)
```

---

## ✅ SECTION 13: DEFINITION OF DONE

BoM feature dianggap **COMPLETE** ketika:

### Functional Requirements
- [ ] Marketing bisa create, edit, submit BoM
- [ ] Engineer Staff bisa refine items dengan rincian
- [ ] Engineer WPO bisa approve/reject BoM
- [ ] Engineer System bisa final approve
- [ ] Procurement bisa add harga sesuai refined qty
- [ ] Permission matrix 100% implemented
- [ ] All permission denials return proper error messages

### Non-Functional Requirements
- [ ] No code warnings/errors in build
- [ ] Database migrations tested & reversible
- [ ] All Server Actions validated with Zod
- [ ] Loading states present di all async operations
- [ ] Dark mode working untuk semua komponen
- [ ] Mobile responsive (tested di mobile view)
- [ ] Performance: page load < 2s, table render < 500ms
- [ ] Accessibility: ARIA labels, keyboard navigation

### Testing & QA
- [ ] Unit tests untuk permission logic (80% coverage)
- [ ] Integration tests untuk workflows
- [ ] Manual testing checklist (Section 8.3) semua ✓
- [ ] Cross-browser testing (Chrome, Firefox, Edge)
- [ ] Database integrity tests (foreign keys, cascades)

### Documentation
- [ ] Code comments untuk complex logic
- [ ] API/Server Actions documented
- [ ] User guide untuk setiap role
- [ ] Admin guide untuk setup & maintenance
- [ ] Troubleshooting guide

---

## 🚀 NEXT STEPS

1. **Review & Approval**
   - Tunjukkan planning ini ke stakeholder (Marketing, Engineering, Procurement leads)
   - Get approval untuk role definitions & workflows
   - Clarify ambiguous requirements

2. **Database Setup**
   - Update schema.prisma dengan models baru
   - Create & test migrations
   - Seed test data

3. **Start Phase 1**
   - Assign developers ke masing-masing modul
   - Create feature branches dari master
   - Daily standups untuk sync progress

4. **Monitoring**
   - Weekly review progress vs roadmap
   - Adjust timeline jika ada blocker
   - Maintain code quality standards

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-04  
**Owner**: Development Team  
**Status**: 🟡 Pending Review & Approval
