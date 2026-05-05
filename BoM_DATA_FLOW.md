# 📊 BoM Data Flow & Architecture Diagram

**Purpose**: Visualize how data flows through the BoM system across roles  
**Audience**: Developers, Architects, QA Engineers

---

## 1. HIGH-LEVEL SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         E-PROCUREMENT SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  MARKETING   │    │  ENGINEER    │    │ PROCUREMENT  │              │
│  │  Module      │    │  Module      │    │  Module      │              │
│  │              │    │  (3 sub)     │    │              │              │
│  │ - Create BoM │    │ - Refine     │    │ - Add Pricing│              │
│  │ - Edit Items │    │ - Approve    │    │ - Track Cost │              │
│  │ - Submit     │    │ - Reject     │    │              │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│        ↓                    ↓                    ↓                      │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │           SHARED: BillOfMaterial Database                    │      │
│  │  ┌────────────────────────────────────────────────────────┐  │      │
│  │  │ BillOfMaterial (Master)                                │  │      │
│  │  │ - bomNo, projectId, status, approvals                 │  │      │
│  │  │                                                        │  │      │
│  │  │  ├─→ BomItem[] (Details - per item in BoM)           │  │      │
│  │  │  │   - marketingDesc (from contract)                  │  │      │
│  │  │  │   - refinedDesc, refinedQty (from engineer)        │  │      │
│  │  │  │   - unitPrice, supplier (from procurement)         │  │      │
│  │  │  │                                                    │  │      │
│  │  │  └─→ BomHistory[] (Audit trail)                      │  │      │
│  │  │      - action, performer, timestamp, details         │  │      │
│  │  │                                                        │  │      │
│  │  └────────────────────────────────────────────────────────┘  │      │
│  └──────────────────────────────────────────────────────────────┘      │
│        ↑                    ↑                    ↑                      │
│        └────────────────────┴────────────────────┘                      │
│                  (Prisma ORM)                                           │
│                      ↓                                                  │
│          ┌──────────────────────────┐                                  │
│          │   MySQL Database         │                                  │
│          │ (Production Database)    │                                  │
│          └──────────────────────────┘                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ROLE-BASED DATA ACCESS FLOW

### 2.1 MARKETING Role Privileges

```
┌─────────────────────────────────────────────────┐
│         MARKETING USER                          │
└─────────────────────────────────────────────────┘
         │
         ├─→ CREATE BoM (DRAFT)
         │   ├─ Generate: bomNo (auto)
         │   ├─ Input: projectId, projectCode, contractNo
         │   ├─ Input: items[] (baseline from contract)
         │   └─ Save to: BillOfMaterial + BomItem
         │       │ Status: DRAFT
         │       │ marketingQty, marketingDesc FILLED
         │       │ refinedQty, refinedDesc EMPTY
         │
         ├─→ EDIT BoM (if DRAFT only)
         │   ├─ Update: BoM meta fields
         │   ├─ Update: marketingDesc, marketingQty
         │   └─ Cannot: change status, add refined data
         │
         ├─→ DELETE BoM (if DRAFT only)
         │   └─ CASCADE delete: BomItems, BomHistory
         │
         ├─→ SUBMIT FOR REFINEMENT
         │   ├─ Status: DRAFT → SUBMITTED
         │   ├─ Lock: BoM fields (read-only for others)
         │   └─ Create: BomHistory "SUBMITTED"
         │
         └─→ ARCHIVE BoM (if ACTIVE only)
             ├─ Status: ACTIVE → ARCHIVED
             └─ Create: BomHistory "ARCHIVED"

CANNOT: View pricing, Approve, Refine items
```

### 2.2 ENGINEER_STAFF Role Privileges

```
┌─────────────────────────────────────────────────┐
│      ENGINEER_STAFF USER                        │
└─────────────────────────────────────────────────┘
         │
         ├─→ VIEW BoM (if SUBMITTED+)
         │   ├─ Read: Marketing baseline data
         │   ├─ Editable: refinedDesc, refinedQty, notes
         │   └─ Read-only: Price info (numbers only, not details)
         │
         ├─→ REFINE BoM ITEMS
         │   ├─ For each item:
         │   │  ├─ refinedDesc (update description)
         │   │  ├─ refinedQty (input quantity needed)
         │   │  ├─ refinedUnit (select unit)
         │   │  └─ notes (technical notes)
         │   ├─ Item Status: PENDING → REFINED
         │   └─ Save: Update BomItem
         │
         ├─→ SUBMIT BoM FOR APPROVAL
         │   ├─ Validation: All items REFINED (qty > 0)
         │   ├─ Status: SUBMITTED → WPO_REVIEW
         │   ├─ Create: BomHistory "SUBMITTED_FOR_APPROVAL"
         │   └─ Notify: Engineer WPO (future)
         │
         └─→ RE-SUBMIT (if REJECTED)
             ├─ Validate: All items updated
             └─ Status: REJECTED → WPO_REVIEW (re-assign)

CANNOT: Delete items, View supplier/unit price, Approve, Archive
```

### 2.3 ENGINEER_WPO Role Privileges (Approval Stage 1)

```
┌──────────────────────────────────────────────────┐
│       ENGINEER_WPO USER                          │
└──────────────────────────────────────────────────┘
         │
         ├─→ VIEW BoM (if WPO_REVIEW or later)
         │   ├─ Read: Marketing baseline
         │   ├─ Read: Refined data (from engineer staff)
         │   ├─ Read: Supplier & unit price (viewing only)
         │   └─ See: Previous approval stage info
         │
         ├─→ APPROVE BoM
         │   ├─ Input: Remarks (optional)
         │   ├─ Validation: Form check (no logic)
         │   ├─ Status: WPO_REVIEW → WPO_APPROVED
         │   ├─ Save: wpoApprovedBy, wpoApprovedAt, remarks
         │   ├─ Create: BomHistory "WPO_APPROVED"
         │   └─ Auto-transition: → SYSTEM_REVIEW (notification to system engineer)
         │
         └─→ REJECT BoM
             ├─ Input: rejectionReason (required)
             ├─ Status: WPO_REVIEW → REJECTED
             ├─ Reset: All items back to PENDING (can re-refine)
             ├─ Create: BomHistory "WPO_REJECTED"
             ├─ Notify: Engineer Staff to re-work
             └─ Can: Re-submit after fixes

CANNOT: Edit BoM data, Add pricing, Delete items, Final approve
```

### 2.4 ENGINEER_SYSTEM Role Privileges (Approval Stage 2)

```
┌──────────────────────────────────────────────────┐
│      ENGINEER_SYSTEM USER                        │
└──────────────────────────────────────────────────┘
         │
         ├─→ VIEW BoM (if SYSTEM_REVIEW or later)
         │   ├─ Read: Full history (all previous stages)
         │   ├─ Read: All refined & approval data
         │   ├─ See: WPO approval remarks
         │   └─ See: Supplier & pricing (view only)
         │
         ├─→ APPROVE BoM (Final)
         │   ├─ Input: Final remarks (optional)
         │   ├─ Status: SYSTEM_REVIEW → SYSTEM_APPROVED
         │   ├─ Save: systemApprovedBy, systemApprovedAt
         │   ├─ Create: BomHistory "SYSTEM_APPROVED"
         │   └─ Auto-transition: → ACTIVE (ready for procurement)
         │
         └─→ REJECT BoM
             ├─ Goes back to WPO (not engineer staff)
             ├─ Input: rejectionReason (required)
             ├─ Status: SYSTEM_REVIEW → REJECTED
             ├─ Create: BomHistory "SYSTEM_REJECTED"
             └─ Notify: Engineer WPO (must re-review & re-approve)

CANNOT: Add pricing, Edit items, Delete, Approve partially
```

### 2.5 PROCUREMENT Role Privileges

```
┌──────────────────────────────────────────────────┐
│        PROCUREMENT USER                          │
└──────────────────────────────────────────────────┘
         │
         ├─→ VIEW BoM (if SYSTEM_APPROVED or ACTIVE)
         │   ├─ Read: Engineering refined items only
         │   │        (NOT marketing baseline)
         │   ├─ See: refinedQty as "demand"
         │   └─ See: All approval history
         │
         ├─→ ADD PRICING FOR ITEMS
         │   ├─ For each BomItem:
         │   │  ├─ unitPrice (required, > 0)
         │   │  ├─ currency (required, default IDR)
         │   │  ├─ supplier (required or optional?)
         │   │  ├─ leadTime (optional, in days)
         │   │  └─ totalPrice = refinedQty × unitPrice (auto-calc)
         │   │
         │   ├─ Item Status: APPROVED → PRICED
         │   ├─ Save: To BomItem (unitPrice, totalPrice, supplier)
         │   └─ Create: BomHistory "PRICED"
         │
         ├─→ UPDATE/EDIT PRICING
         │   ├─ Can re-price items
         │   ├─ Re-calculate totals
         │   └─ Save: New unitPrice
         │
         ├─→ GENERATE BoM SUMMARY
         │   ├─ Total cost = SUM(totalPrice of all items)
         │   ├─ Average lead time
         │   └─ Items per supplier breakdown
         │
         └─→ SUBMIT BoM TO ACTIVE (System auto on all priced)
             ├─ Status: SYSTEM_APPROVED → ACTIVE
             ├─ All items must be PRICED
             └─ BoM ready for PO generation

CANNOT: Delete items, Edit BoM structure, Approve, View marketing baseline (different from refined)
```

---

## 3. STATE TRANSITION DIAGRAM

### 3.1 BoM Status Transitions

```
                        ┌─────────┐
                        │  DRAFT  │  ← Created by Marketing
                        └────┬────┘
                             │
                    Marketing submits
                             │
                        ┌────v────┐
                        │SUBMITTED │  ← Waiting for Engineer Staff to refine
                        └────┬────┘
                             │
                  All items refined, submit
                             │
                        ┌────v────────┐
                        │ WPO_REVIEW   │  ← Waiting for WPO approval
                        └┬───────────┬─┘
                         │           │
                    Approve      Reject
                         │           │
                         │      ┌────v──────┐
                         │      │ REJECTED  │  ← Back to engineer to re-work
                         │      └────┬──────┘
                         │           │
                         │    Re-submit items
                         │           │
                         │      ┌────v────────┐
                         │      │ WPO_REVIEW  │  ← Re-enters approval flow
                         │      └────┬────────┘
                         │           │
                         └────┬──────┘
                              │
                         ┌────v──────────┐
                         │SYSTEM_REVIEW  │  ← Waiting for System Engineer
                         └┬──────────┬──┘
                          │          │
                    Approve       Reject
                          │          │
                          │     ┌────v──────────┐
                          │     │ REJECTED      │  ← Back to WPO
                          │     └────┬──────────┘
                          │          │
                          │   WPO reviews & approves again
                          │          │
                          │     ┌────v──────────┐
                          │     │ SYSTEM_REVIEW │
                          │     └────┬──────────┘
                          │          │
                          └────┬─────┘
                               │
                         ┌─────v────────┐
                         │SYSTEM_APPROVED│ ← Ready for pricing
                         └─────┬────────┘
                               │
                      Procurement adds prices
                               │
                         ┌─────v─────┐
                         │  ACTIVE   │  ← Ready for PO generation
                         └─────┬─────┘
                               │
                        (Manual archive)
                               │
                         ┌─────v────────┐
                         │  ARCHIVED    │  ← Old BoM (inactive)
                         └──────────────┘
```

### 3.2 BoM Item Status Transitions

```
        ┌──────────┐
        │ PENDING  │  ← Item added by Marketing
        └────┬─────┘
             │
    Engineer refines & saves
             │
        ┌────v──────┐
        │ REFINED   │  ← Engineer staff completed refinement
        └────┬──────┘
             │
    WPO/System approval (status at BoM level)
             │
        ┌────v─────────┐
        │  APPROVED    │  ← Passed approval, ready for pricing
        └────┬────────┘
             │
    Procurement adds pricing
             │
        ┌────v───┐
        │ PRICED │  ← Ready for PO
        └────────┘
```

---

## 4. DATA FLOW: COMPLETE USER JOURNEY

### 4.1 Happy Path: MARKETING → ENGINEER → PROCUREMENT

```
STEP 1: Marketing creates BoM
┌──────────────────────────────────────┐
│ Input:                               │
│  - Project: "2244"                   │
│  - Items: [                          │
│    {marketingDesc: "Motor 5HP",      │
│     marketingQty: 2, unit: "Unit"},  │
│    {marketingDesc: "Coupling",       │
│     marketingQty: 4, unit: "Pcs"}    │
│  ]                                   │
└──────────────────────────────────────┘
            ↓
         Save to DB
            ↓
┌──────────────────────────────────────┐
│ Database: BillOfMaterial             │
│ - bomNo: "BOM-2026-0001"             │
│ - status: DRAFT                      │
│ - createdBy: marketing_user_id       │
│ - createdAt: 2026-05-04 10:30:00     │
│                                      │
│ Database: BomItem[]                  │
│ - item[0]: marketingDesc="Motor 5HP" │
│           marketingQty=2             │
│           itemStatus=PENDING         │
│ - item[1]: marketingDesc="Coupling"  │
│           marketingQty=4             │
│           itemStatus=PENDING         │
└──────────────────────────────────────┘

STEP 2: Marketing submits for refinement
┌──────────────────────────────────────┐
│ Action: Click "Submit for Refinement"│
└──────────────────────────────────────┘
            ↓
         Update DB
            ↓
┌──────────────────────────────────────┐
│ Update: BillOfMaterial               │
│ - status: SUBMITTED                  │
│ - submittedBy: marketing_user_id     │
│ - submittedAt: 2026-05-04 11:00:00   │
│                                      │
│ Create: BomHistory                   │
│ - action: "SUBMITTED"                │
│ - performer: marketing_user_id       │
│ - timestamp: 2026-05-04 11:00:00     │
│ - details: "BoM submitted for eng.." │
└──────────────────────────────────────┘

STEP 3: Engineer Staff views & refines items
┌──────────────────────────────────────┐
│ Fetch from DB:                       │
│ - View marketing baseline             │
│ - Input refined data:                 │
│   [                                   │
│    {refinedDesc: "Motor AC 5HP 380V" │
│     refinedQty: 2, unit: "Pcs",      │
│     notes: "As per drawing 123"},    │
│    {refinedDesc: "Flexible Coupling" │
│     refinedQty: 4, unit: "Pcs",      │
│     notes: "20mm bore"}               │
│   ]                                   │
└──────────────────────────────────────┘
            ↓
         Submit all refined
            ↓
┌──────────────────────────────────────┐
│ Update: BomItem[]                    │
│ - item[0]: refinedDesc="Motor AC..."  │
│           refinedQty=2                │
│           notes="As per drawing..."   │
│           itemStatus=REFINED          │
│           updatedAt=2026-05-04 14:00  │
│ - item[1]: refinedDesc="Flexible..." │
│           refinedQty=4                │
│           itemStatus=REFINED          │
│                                       │
│ Update: BillOfMaterial                │
│ - status: WPO_REVIEW                  │
│                                       │
│ Create: BomHistory                    │
│ - action: "SUBMITTED_FOR_APPROVAL"    │
│ - performer: engineer_staff_user_id   │
└──────────────────────────────────────┘

STEP 4: Engineer WPO approves
┌──────────────────────────────────────┐
│ Review & Add Remarks:                │
│ "Approved - spec matches drawing"    │
│                                       │
│ Click [Approve]                      │
└──────────────────────────────────────┘
            ↓
         Update DB
            ↓
┌──────────────────────────────────────┐
│ Update: BillOfMaterial                │
│ - status: WPO_APPROVED                │
│ - wpoApprovedBy: wpo_engineer_id      │
│ - wpoApprovedAt: 2026-05-04 15:00:00  │
│ - wpoRemarks: "Approved - spec..."    │
│                                       │
│ Create: BomHistory                    │
│ - action: "WPO_APPROVED"              │
│ - performer: wpo_engineer_id          │
└──────────────────────────────────────┘

STEP 5: Engineer System final approval
┌──────────────────────────────────────┐
│ Review all history & approve          │
│ Click [Approve]                      │
└──────────────────────────────────────┘
            ↓
         Update DB
            ↓
┌──────────────────────────────────────┐
│ Update: BillOfMaterial                │
│ - status: SYSTEM_APPROVED             │
│ - systemApprovedBy: system_eng_id     │
│ - systemApprovedAt: 2026-05-04 16:00  │
│                                       │
│ Update: BomItem[]                    │
│ - item[*]: itemStatus=APPROVED        │
│                                       │
│ Create: BomHistory                    │
│ - action: "SYSTEM_APPROVED"           │
│ - performer: system_eng_id            │
└──────────────────────────────────────┘

STEP 6: Procurement adds pricing
┌──────────────────────────────────────┐
│ Fetch items with refinedQty:          │
│ - Motor AC 5HP: Qty=2                 │
│ - Flexible Coupling: Qty=4            │
│                                       │
│ Add pricing:                          │
│ - Motor: unitPrice=5,000,000 IDR      │
│          supplier="PT Siemens"        │
│          leadTime=14 days             │
│          totalPrice=10,000,000        │
│                                       │
│ - Coupling: unitPrice=500,000 IDR     │
│            supplier="PT Trans"        │
│            leadTime=7 days            │
│            totalPrice=2,000,000       │
└──────────────────────────────────────┘
            ↓
         Submit pricing
            ↓
┌──────────────────────────────────────┐
│ Update: BomItem[]                    │
│ - item[0]: unitPrice=5000000          │
│           totalPrice=10000000         │
│           supplier="PT Siemens"       │
│           leadTime=14                 │
│           itemStatus=PRICED           │
│ - item[1]: unitPrice=500000           │
│           totalPrice=2000000          │
│           supplier="PT Trans"         │
│           leadTime=7                  │
│           itemStatus=PRICED           │
│                                       │
│ Update: BillOfMaterial                │
│ - status: ACTIVE                      │
│                                       │
│ Create: BomHistory                    │
│ - action: "PRICED"                    │
│ - performer: procurement_user_id      │
└──────────────────────────────────────┘

FINAL STATE: BoM Ready for PO
┌──────────────────────────────────────┐
│ BillOfMaterial                        │
│ - bomNo: BOM-2026-0001                │
│ - projectId: "2244"                   │
│ - status: ACTIVE                      │
│ - totalCost: 12,000,000 IDR           │
│ - avgLeadTime: 10.5 days              │
│                                       │
│ Ready to generate:                    │
│ - Purchase Orders (PO)                │
│ - Material Requests (MR)              │
│ - Procurement Schedule                │
└──────────────────────────────────────┘
```

---

## 5. DATABASE RELATIONSHIPS DIAGRAM

```
                    ┌─────────────┐
                    │ User        │
                    ├─────────────┤
                    │ id (PK)     │
                    │ username    │
                    │ name        │
                    │ role        │
                    │ engineerRole│
                    └────┬────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         │ createdBy     │ submittedBy   │ approvedBy
         │               │               │
         v               v               v
    ┌────────────────────────────────────────────┐
    │  BillOfMaterial                            │
    ├────────────────────────────────────────────┤
    │ id (PK, CUID)                              │
    │ bomNo (unique)                             │
    │ projectId (FK)                             │
    │ projectName                                │
    │ projectCode                                │
    │ bomStatus (enum)                           │
    │ createdBy (FK → User)                      │
    │ submittedBy (FK → User, nullable)          │
    │ wpoApprovedBy (FK → User, nullable)        │
    │ wpoApprovedAt (timestamp)                  │
    │ wpoRemarks (text)                          │
    │ systemApprovedBy (FK → User, nullable)     │
    │ systemApprovedAt (timestamp)               │
    │ systemRemarks (text)                       │
    │ createdAt, updatedAt (timestamps)          │
    └┬──────────────────┬──────────────────────┬─┘
     │                  │                      │
  one-to-many       one-to-many            one-to-many
     │                  │                      │
     │                  │                      │
     v                  v                      v
   ┌──────────────┐  ┌──────────────┐    ┌──────────────┐
   │ BomItem      │  │ BomHistory   │    │ (User refs)  │
   ├──────────────┤  ├──────────────┤    └──────────────┘
   │ id (PK)      │  │ id (PK)      │
   │ bomId (FK)   │  │ bomId (FK)   │
   │              │  │ performer    │
   │ Marketing    │  │ (FK → User)  │
   │ - marketDesc │  │              │
   │ - marketQty  │  │ action (str) │
   │ - marketUnit │  │ timestamp    │
   │              │  │ details (txt)│
   │ Engineer     │  │ prevData     │
   │ - refinedDesc│  │ newData      │
   │ - refinedQty │  └──────────────┘
   │ - refinedUnit│
   │ - notes      │
   │              │
   │ Procurement  │
   │ - unitPrice  │
   │ - totalPrice │
   │ - supplier   │
   │ - leadTime   │
   │ - currency   │
   │              │
   │ Status       │
   │ - itemStatus │
   │ (enum)       │
   │ - rejReason  │
   │              │
   │ createdAt,   │
   │ updatedAt    │
   └──────────────┘
```

---

## 6. PERMISSION DECISION TREE

```
User tries action: "VIEW_BOM_DETAIL"
│
├─→ Can user access system at all? (logged in?)
│   ├─ NO  → Redirect to /login
│   └─ YES → Continue
│
├─→ Does BoM exist?
│   ├─ NO  → Show 404
│   └─ YES → Continue
│
├─→ Check user's role & BoM status
│   │
│   ├─ MARKETING user:
│   │  ├─ Own BoM (createdBy) in any status → ALLOW
│   │  └─ Other's BoM in any status → DENY
│   │
│   ├─ ENGINEER_STAFF:
│   │  ├─ Status SUBMITTED+ → ALLOW (can refine & see prices)
│   │  └─ Status DRAFT → DENY
│   │
│   ├─ ENGINEER_WPO:
│   │  ├─ Status WPO_REVIEW+ → ALLOW (can approve & see prices)
│   │  └─ Status DRAFT/SUBMITTED → DENY
│   │
│   ├─ ENGINEER_SYSTEM:
│   │  ├─ Status SYSTEM_REVIEW+ → ALLOW (final approve & see prices)
│   │  └─ Status < SYSTEM_REVIEW → DENY
│   │
│   └─ PROCUREMENT:
│      ├─ Status SYSTEM_APPROVED+ → ALLOW (add prices)
│      └─ Status < SYSTEM_APPROVED → DENY
│
└─→ Grant access with role-specific visibility (see Component Props section)
```

---

## 7. SERVER ACTION FLOW

### 7.1 Example: createBom (Marketing)

```
USER: Marketing clicks [+ Create BoM]
│
│ FORM SUBMISSION (Client)
│ ├─ projectId: "2244"
│ ├─ projectName: "Bridge Construction"
│ ├─ items: [
│ │   {marketingDesc: "Steel Beam", marketingQty: 10, unit: "Unit"},
│ │   {marketingDesc: "Bolt M20", marketingQty: 200, unit: "Pcs"}
│ │ ]
│ └─ Submit to Server Action
│
v
SERVER ACTION: createBom(formData)
│
├─→ Parse & Validate input
│   ├─ Use Zod schema to validate all fields
│   ├─ Validate qty > 0
│   ├─ Validate projectId exists
│   └─ Return errors if invalid
│
├─→ Permission check
│   ├─ Get user from session
│   ├─ Check user.role === "MARKETING"
│   └─ Reject if not marketing user
│
├─→ Generate BoM number
│   ├─ Get latest BoM: SELECT MAX(bomNo) ...
│   ├─ Increment: BOM-2026-0001 → BOM-2026-0002
│   └─ Ensure unique
│
├─→ Create database transaction
│   ├─ prisma.billOfMaterial.create({
│   │   data: {
│   │     bomNo: "BOM-2026-0002",
│   │     projectId: "2244",
│   │     projectName: "Bridge Construction",
│   │     bomStatus: "DRAFT",
│   │     createdBy: user.id,
│   │     items: {
│   │       createMany: {
│   │         data: [
│   │           {marketingDesc: "Steel Beam", marketingQty: 10, ...},
│   │           {marketingDesc: "Bolt M20", marketingQty: 200, ...}
│   │         ]
│   │       }
│   │     }
│   │   }
│   │ })
│   └─ Save to MySQL (atomic)
│
├─→ Create history entry
│   └─ prisma.bomHistory.create({
│       action: "CREATED",
│       bomId: createdBom.id,
│       performer: user.id,
│       ...
│     })
│
├─→ Revalidate cache
│   └─ revalidatePath("/marketing/bom")
│
└─→ Return response
    └─ { success: true, bomId: "...", message: "BoM created" }

RESPONSE → CLIENT
├─ Parse response
├─ If success: Show toast + redirect to detail page
└─ If error: Show error message

USER SEES: "BoM BOM-2026-0002 created successfully"
```

### 7.2 Example: approveBom (WPO)

```
USER: Engineer WPO clicks [Approve]
│
│ FORM: Add remarks & submit
│ ├─ Remarks: "Spec matches design"
│ └─ Submit to Server Action
│
v
SERVER ACTION: approveBom(bomId, "WPO", remarks)
│
├─→ Validate input
│   ├─ bomId provided
│   ├─ remarks < 1000 chars
│   └─ Return errors if not valid
│
├─→ Permission check
│   ├─ Get user from session
│   ├─ Check user.engineerRole === "WPO"
│   └─ Reject if not WPO engineer
│
├─→ Verify BoM state
│   ├─ Fetch: SELECT * FROM BillOfMaterial WHERE id = bomId
│   ├─ Check: bomStatus === "WPO_REVIEW"
│   └─ Reject if wrong status
│
├─→ Update BoM approval
│   └─ prisma.billOfMaterial.update({
│       where: { id: bomId },
│       data: {
│         bomStatus: "WPO_APPROVED",
│         wpoApprovedBy: user.id,
│         wpoApprovedAt: new Date(),
│         wpoRemarks: remarks
│       }
│     })
│
├─→ Create history entry
│   └─ prisma.bomHistory.create({
│       action: "WPO_APPROVED",
│       bomId,
│       performer: user.id,
│       details: `Approved by ${user.name}`,
│       newData: JSON.stringify(updatedBom)
│     })
│
├─→ Revalidate pages
│   ├─ revalidatePath(`/engineer/bom/${bomId}`)
│   └─ revalidatePath("/engineer/bom")
│
└─→ Return response
    └─ { success: true, message: "BoM approved" }

RESPONSE → CLIENT
├─ Show success toast
├─ Redirect to detail page
└─ Show updated status (WPO_APPROVED)

FUTURE: Notify System Engineer (email/webhook)
```

---

## 8. COMPONENT PROPS FLOW

### 8.1 BomItemTable Component

```
Parent Component: /engineer/bom/[bomId]/approve/page.js
│
├─ Server fetches data:
│  └─ bom = await prisma.billOfMaterial.findUnique({
│      include: { items: true }
│    })
│
└─ Pass to client component:
   │
   v
<BomItemTable
  items={[
    {
      id: "item-123",
      marketingDesc: "Motor 5HP",
      marketingQty: 2,
      refinedDesc: "Motor AC 5HP 380V",
      refinedQty: 2,
      unit: "Unit",
      notes: "As per drawing 123",
      itemStatus: "REFINED",
      unitPrice: 5000000,
      totalPrice: 10000000
    },
    ...
  ]}
  
  viewMode="approve"  // "view" | "refine" | "approve" | "price"
  
  onApprove={async (itemId) => {
    // Call server action to approve
    await approveBomItem(itemId)
  }}
  
  onReject={(itemId, reason) => {
    // Call server action to reject
  }}
/>

Component renders:
├─ If viewMode="view":
│  └─ Read-only table (all columns, no edit)
│
├─ If viewMode="refine":
│  └─ Editable: refinedDesc, refinedQty, notes
│     Buttons: [Save] per row, [Submit All]
│
├─ If viewMode="approve":
│  └─ Read-only: Items + [Approve] [Reject] buttons
│     Remarks textarea
│
└─ If viewMode="price":
   └─ Editable: unitPrice, supplier, leadTime
      Read-only: refinedQty (no manual edit)
      Auto-calc: totalPrice
```

---

## 9. AUDIT TRAIL EXAMPLE

```
BomHistory entries for: BOM-2026-0001

#1. CREATED
   timestamp: 2026-05-04 10:30:00
   action: "CREATED"
   performedBy: marketing_user (PT Maju Jaya - Marketing)
   details: "BoM created for Project 2244"
   newData: {bomNo, projectId, items[]}

#2. SUBMITTED
   timestamp: 2026-05-04 11:00:00
   action: "SUBMITTED"
   performedBy: marketing_user
   details: "BoM submitted for engineer refinement"
   previousData: {status: DRAFT}
   newData: {status: SUBMITTED}

#3. REFINED (item-level)
   timestamp: 2026-05-04 14:15:00
   action: "ITEM_REFINED"
   performedBy: engineer_staff_user (Ahmad Hidayat - Engineer)
   details: "Refined Motor item"
   newData: {refinedDesc, refinedQty: 2, notes: "As per drawing"}

#4. SUBMITTED_FOR_APPROVAL
   timestamp: 2026-05-04 14:45:00
   action: "SUBMITTED_FOR_APPROVAL"
   performedBy: engineer_staff_user
   details: "All items refined, submitted to WPO"
   previousData: {status: SUBMITTED}
   newData: {status: WPO_REVIEW}

#5. WPO_APPROVED
   timestamp: 2026-05-04 15:30:00
   action: "WPO_APPROVED"
   performedBy: wpo_engineer_user (Siti Nurhaliza - WPO)
   details: "Approved by WPO. Remarks: Spec matches design"
   wpoRemarks: "Spec matches design"
   previousData: {status: WPO_REVIEW}
   newData: {status: WPO_APPROVED, wpoApprovedBy, wpoApprovedAt}

#6. SYSTEM_APPROVED
   timestamp: 2026-05-04 16:00:00
   action: "SYSTEM_APPROVED"
   performedBy: system_engineer_user (Budi Santoso - System)
   details: "Final approval by System Engineer"
   systemRemarks: "Ready for procurement"
   previousData: {status: WPO_APPROVED}
   newData: {status: SYSTEM_APPROVED, systemApprovedBy, systemApprovedAt}

#7. PRICED (item-level)
   timestamp: 2026-05-04 17:00:00
   action: "ITEM_PRICED"
   performedBy: procurement_user (Eka Putri - Procurement)
   details: "Added pricing for Motor item"
   newData: {unitPrice: 5000000, supplier: "PT Siemens", leadTime: 14}

#8. PRICED (item-level)
   timestamp: 2026-05-04 17:05:00
   action: "ITEM_PRICED"
   performedBy: procurement_user
   details: "Added pricing for Coupling item"
   newData: {unitPrice: 500000, supplier: "PT Trans", leadTime: 7}

#9. ACTIVATED
   timestamp: 2026-05-04 17:10:00
   action: "ACTIVATED"
   performedBy: system_generated
   details: "All items priced. BoM marked ACTIVE"
   previousData: {status: SYSTEM_APPROVED}
   newData: {status: ACTIVE}
```

Complete audit trail allows:
- ✅ Who made what change
- ✅ When changes occurred
- ✅ What exactly changed
- ✅ Who approved at each stage
- ✅ Rejection reasons if any
- ✅ Remarks from approvers

---

**Visualization complete!**  
Use this diagram together with the main planning documents to understand data flows and integration points.
