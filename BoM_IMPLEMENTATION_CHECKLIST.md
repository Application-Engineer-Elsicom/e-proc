# ✅ BoM Feature - Implementation Checklist

**Status**: Ready for Phase 1 Start  
**Priority**: 🔴 HIGH  
**Est. Timeline**: 5-6 weeks  

---

## 🔧 PHASE 1: FOUNDATION (Week 1-2)

### Database & Prisma
- [ ] **Update Prisma Schema**
  - [ ] Add enums: `BomStatus`, `BomItemStatus`, `EngineerRole`
  - [ ] Add model: `BillOfMaterial`
  - [ ] Add model: `BomItem`
  - [ ] Add model: `BomHistory`
  - [ ] Update `User` model: add `engineerRole` field
  - [ ] Add all relationships & indices
  - **File**: `prisma/schema.prisma`
  - **Checklist**: Schema compiles without errors

- [ ] **Create & Test Migration**
  ```bash
  npx prisma migrate dev --name add_bom_models
  ```
  - [ ] Migration runs successfully
  - [ ] Tables created in MySQL
  - [ ] Foreign keys correct
  - [ ] Indices exist
  - [ ] Rollback tested

- [ ] **Generate Prisma Client**
  ```bash
  npx prisma generate
  ```

### Library Functions
- [ ] **Create Permission Helper**
  - **File**: `app/lib/permissions.js`
  - Functions:
    - [ ] `checkBomPermission(userId, bomId, action)` → boolean
    - [ ] `getUserRole(userId)` → role object
    - [ ] `canCreateBom(user)` → MARKETING only
    - [ ] `canRefineBom(user)` → ENGINEER_STAFF only
    - [ ] `canApproveBom(user, stage)` → WPO or SYSTEM
    - [ ] `canPriceBom(user)` → PROCUREMENT only
  - **Tests**: All functions return correct boolean

- [ ] **Create BoM Utilities**
  - **File**: `app/lib/bom-utils.js`
  - Functions:
    - [ ] `generateBomNo()` → "BOM-2026-XXXX"
    - [ ] `calculateTotalPrice(items[])` → decimal
    - [ ] `countRefinedItems(bomItems[])` → number
    - [ ] `isAllItemsRefined(bomItems[])` → boolean
    - [ ] `formatBomDate(date)` → string
    - [ ] `getBomStatusLabel(status)` → user-friendly string
  - **Tests**: All utility functions tested

- [ ] **Create Zod Schemas for Validation**
  - **File**: `app/lib/zod-schemas.js` (or add to separate folder)
  - Schemas:
    - [ ] `BomCreateSchema`
    - [ ] `BomUpdateSchema`
    - [ ] `BomItemSchema`
    - [ ] `BomApprovalSchema`
    - [ ] `BomPricingSchema`
  - **Tests**: All schemas validate correctly

### Test Data & Seed
- [ ] **Update Seed Script**
  - **File**: `seed.js`
  - Add:
    - [ ] 2x MARKETING users
    - [ ] 3x ENGINEER_STAFF users
    - [ ] 2x ENGINEER_WPO users
    - [ ] 1x ENGINEER_SYSTEM user
    - [ ] 2x PROCUREMENT users
    - [ ] 5x Sample projects (with projectId, projectCode)
    - [ ] 3x Sample BoMs in different statuses
  - **Run**: 
    ```bash
    npx prisma db seed
    ```
  - **Verify**: Data visible in MySQL

### Configuration
- [ ] **Update .env.local**
  - [ ] Add BoM feature flags
  - [ ] Verify DATABASE_URL is set
  - [ ] Test DB connection works

- [ ] **Update tsconfig.json or jsconfig.json**
  - [ ] Path alias for `@/lib` (if not already)
  - [ ] Path alias for `@/components` (if not already)

### Quality Checks
- [ ] **No Build Errors**
  ```bash
  npm run build
  ```
  - [ ] Build succeeds
  - [ ] No TypeScript errors
  - [ ] No console warnings

- [ ] **Linting**
  ```bash
  npm run lint
  ```
  - [ ] All files pass biome check
  - [ ] Format code if needed: `npm run format`

---

## 📂 PHASE 2: MARKETING MODULE (Week 3)

### Folder Structure
- [ ] **Create `/app/marketing` folder**
  - [ ] `layout.js`
  - [ ] `page.js`
  - [ ] `bom/` subfolder

### Server Actions
- [ ] **Create** `app/actions/bom.js`
  - [ ] `createBom(formData)` - validates, generates bomNo, saves
  - [ ] `updateBom(bomId, data)` - only if DRAFT & creator
  - [ ] `deleteBom(bomId)` - only if DRAFT & creator
  - [ ] `submitBomForRefinement(bomId)` - DRAFT → SUBMITTED
  - [ ] `archiveBom(bomId)` - ACTIVE → ARCHIVED
  - [ ] Error handling with try-catch
  - [ ] Logging untuk audit trail
  - **Tests**: All functions return correct response

### Marketing Layout & Pages
- [ ] **Marketing Layout**
  - **File**: `app/marketing/layout.js`
  - [ ] Navigation menu (BoM, Projects, Settings)
  - [ ] User info badge with role
  - [ ] Consistent styling with engineer module

- [ ] **Marketing Dashboard**
  - **File**: `app/marketing/page.js`
  - [ ] Welcome message
  - [ ] Quick stats (Total BoMs, Active, Draft, Archived)
  - [ ] Link ke BoM list
  - [ ] Recent activity

- [ ] **BoM List Page**
  - **File**: `app/marketing/bom/page.js`
  - [ ] Server component (async)
  - [ ] Fetch BoMs created by user
  - [ ] Button: [+ Create BoM]
  - [ ] Table: BOM No | Project | Status | Items | Created | Actions
  - [ ] Filters: Status, Project
  - [ ] Pagination (50 per page)
  - [ ] Empty state message
  - [ ] Loading state

- [ ] **Create BoM Form Page**
  - **File**: `app/marketing/bom/create/page.js`
  - [ ] Client component ("use client")
  - [ ] Form fields:
    - [ ] Project (select from list)
    - [ ] Project Code
    - [ ] Contract No (optional)
    - [ ] Description (textarea)
  - [ ] Button: [Add Item Row]
  - [ ] Dynamic items table (editable, deletable)
  - [ ] Items fields: Description | Qty | Unit | Delete button
  - [ ] Buttons: [Save Draft] [Submit for Refinement] [Cancel]
  - [ ] Form validation (Zod)
  - [ ] Error messages display
  - [ ] Loading state
  - [ ] Success toast/redirect

- [ ] **BoM Detail/Edit Page**
  - **File**: `app/marketing/bom/[bomId]/page.js`
  - [ ] Permission check: creator only
  - [ ] Editable form jika DRAFT
  - [ ] Read-only view jika SUBMITTED+
  - [ ] Show items table with marketing data
  - [ ] Buttons (conditional):
    - [ ] [Edit] jika DRAFT
    - [ ] [Submit] jika DRAFT
    - [ ] [Archive] jika ACTIVE
    - [ ] [Delete] jika DRAFT

### Components
- [ ] **BomHeader Component**
  - **File**: `app/components/bom/BomHeader.js`
  - [ ] Displays: BOM No, Project, Status badge
  - [ ] Status badge color-coded
  - [ ] Creation info (by, date)
  - [ ] Timeline indicator (3/4 approvals done)

- [ ] **BomItemTable Component (Marketing View)**
  - **File**: `app/components/bom/BomItemTable.js`
  - [ ] Renders items table
  - [ ] Columns: Item# | Desc | Qty | Unit | Actions
  - [ ] Edit/delete buttons (if DRAFT)
  - [ ] Props: items[], onUpdate, onDelete, editable

### Testing
- [ ] **Manual Tests**
  - [ ] Login as MARKETING user
  - [ ] Create new BoM (draft)
  - [ ] Add 3-5 items
  - [ ] Save as draft
  - [ ] Edit existing draft
  - [ ] Add more items
  - [ ] Submit for refinement
  - [ ] Verify status changed
  - [ ] Try to edit after submitted (should be read-only)
  - [ ] Login as ENGINEER (should not see marketing section)
  - [ ] Verify delete button only shows in DRAFT

---

## 👨‍💼 PHASE 3: ENGINEER MODULE (Week 4-5)

### Folder Structure
- [ ] **Create `/app/engineer/bom` folder**
  - [ ] `page.js` - dashboard
  - [ ] `[bomId]/` subfolder
    - [ ] `refine/page.js`
    - [ ] `approve/page.js`
    - [ ] `view/page.js`

### Server Actions
- [ ] **Create** `app/actions/bom-item.js`
  - [ ] `refineBomItem(itemId, refinedData)` 
    - Validate ENGINEER_STAFF
    - Validate parent BoM not REJECTED
    - Update refinedDesc, refinedQty, notes
    - Set itemStatus = REFINED
  - [ ] `submitBomForApproval(bomId)`
    - Validate ENGINEER_STAFF
    - Validate all items REFINED
    - BoM status: SUBMITTED → WPO_REVIEW
  - [ ] `approveBom(bomId, engineerRole, remarks)`
    - Validate WPO or SYSTEM role
    - Update approver info & timestamp
    - If WPO: set status WPO_APPROVED
    - If SYSTEM: set status SYSTEM_APPROVED
  - [ ] `rejectBom(bomId, engineerRole, rejectionReason)`
    - Validate WPO or SYSTEM role
    - Set status REJECTED
    - Save reason
    - Reset itemStatus to PENDING

### Engineer Dashboards & Pages
- [ ] **Engineer Layout**
  - **File**: `app/engineer/layout.js`
  - [ ] Add "BoM" menu item
  - [ ] Navigation: Dashboard | Material Request | **BoM** | Fault Report

- [ ] **Engineer BoM Dashboard**
  - **File**: `app/engineer/bom/page.js`
  - [ ] Server component (async)
  - [ ] Check engineerRole for appropriate view
  - [ ] **If ENGINEER_STAFF:**
    - [ ] Show: BoMs assigned to refine (SUBMITTED status)
    - [ ] Table: BOM No | Project | Item Count | Refined Count | Status | Actions
    - [ ] Button: [Refine]
    - [ ] Card: "3 BoMs pending refinement"
  - [ ] **If ENGINEER_WPO:**
    - [ ] Show: BoMs pending WPO approval (WPO_REVIEW status)
    - [ ] Table: BOM No | Project | Submitted By | Date | Actions
    - [ ] Button: [Review & Approve]
    - [ ] Card: "2 BoMs waiting approval"
  - [ ] **If ENGINEER_SYSTEM:**
    - [ ] Show: BoMs pending system approval (SYSTEM_REVIEW status)
    - [ ] Similar to WPO dashboard

- [ ] **Refine BoM Page (Engineer Staff only)**
  - **File**: `app/engineer/bom/[bomId]/refine/page.js`
  - [ ] Permission check: ENGINEER_STAFF only
  - [ ] Display BoM header
  - [ ] Table: Marketing data (read-only) + Engineer refine fields
  - Columns:
    - [ ] Item # (row number)
    - [ ] Marketing Desc (read-only)
    - [ ] Marketing Qty (read-only, faded)
    - [ ] **Refined Desc** (editable textarea)
    - [ ] **Refined Qty** (editable number)
    - [ ] **Unit** (editable select)
    - [ ] **Notes** (editable textarea)
  - [ ] Buttons: [Save Progress] [Submit All] [Cancel]
  - [ ] Validation: All rows refined, qty > 0
  - [ ] Success message on submit
  - [ ] Error handling

- [ ] **Approve BoM Page (WPO & System)**
  - **File**: `app/engineer/bom/[bomId]/approve/page.js`
  - [ ] Permission check: ENGINEER_WPO or ENGINEER_SYSTEM
  - [ ] Display BoM header with timeline
  - [ ] Table: Refined items (read-only view)
  - Columns:
    - [ ] Item # | Description | Qty | Unit | Notes | Status
  - [ ] Show previous approval stage info (if any)
  - [ ] **Approval Section:**
    - [ ] Remarks textarea
    - [ ] [Approve] button (green)
    - [ ] [Reject] button (red)
  - [ ] If reject:
    - [ ] Show rejection reason input (required)
    - [ ] Confirmation: "Are you sure? This goes back to engineer."
  - [ ] Success/error handling

- [ ] **View BoM Page**
  - **File**: `app/engineer/bom/[bomId]/view/page.js`
  - [ ] Read-only view of full BoM
  - [ ] Show all stages (marketing, engineer, approvals, pricing)
  - [ ] Timeline with all approvals
  - [ ] No edit buttons

### Components
- [ ] **BomStatusTimeline Component**
  - **File**: `app/components/bom/BomStatusTimeline.js`
  - [ ] Visual timeline: Marketing → Engineer → WPO → System → Pricing
  - [ ] Each stage shows:
    - [ ] Status (pending, done, rejected)
    - [ ] User who performed
    - [ ] Timestamp
    - [ ] Remarks/reason (if any)
  - [ ] Color-coded (gray=pending, green=done, red=rejected)

- [ ] **BomApprovalSection Component**
  - **File**: `app/components/bom/BomApprovalSection.js`
  - [ ] Conditional render (only if user can approve)
  - [ ] Remarks textarea
  - [ ] [Approve] [Reject] buttons
  - [ ] Confirmation dialog
  - [ ] Props: bomId, stage, onApprove, onReject

- [ ] **Update BomItemTable for Engineer View**
  - [ ] Add refinedDesc, refinedQty, notes columns
  - [ ] Editable mode for ENGINEER_STAFF refining
  - [ ] Read-only mode for approvals
  - [ ] Show status badge per item

### Testing
- [ ] **Engineer Staff Flow**
  - [ ] Login as ENGINEER_STAFF
  - [ ] See BoM in SUBMITTED status
  - [ ] Open refine page
  - [ ] Edit 2-3 items (desc, qty, notes)
  - [ ] Click "Submit All"
  - [ ] Verify redirect to list
  - [ ] Verify status changed to WPO_REVIEW

- [ ] **Engineer WPO Flow**
  - [ ] Login as ENGINEER_WPO
  - [ ] See BoM in WPO_REVIEW
  - [ ] Open approval page
  - [ ] Add remarks
  - [ ] Click "Approve"
  - [ ] Verify status → SYSTEM_REVIEW
  - [ ] Verify redirect

- [ ] **Reject Flow**
  - [ ] As ENGINEER_WPO, reject BoM
  - [ ] Add rejection reason
  - [ ] Verify status → REJECTED
  - [ ] Engineer Staff sees it in "Rejected" section
  - [ ] Can re-submit after fixing

- [ ] **Permission Tests**
  - [ ] ENGINEER_STAFF cannot see approval section
  - [ ] ENGINEER_WPO cannot access refine page
  - [ ] Non-engineer cannot access BoM section
  - [ ] ENGINEER_SYSTEM cannot see pricing

---

## 💰 PHASE 4: PROCUREMENT MODULE (Week 5)

### Folder Structure
- [ ] **Create `/app/procurement` folder**
  - [ ] `layout.js`
  - [ ] `page.js`
  - [ ] `bom/` subfolder
    - [ ] `page.js`
    - [ ] `[bomId]/pricing/page.js`
    - [ ] `[bomId]/view/page.js`

### Server Actions
- [ ] **Create** `app/actions/bom-procurement.js`
  - [ ] `addBomItemPrice(itemId, priceData)`
    - Validate PROCUREMENT role
    - Validate parent BoM SYSTEM_APPROVED
    - Update: unitPrice, supplier, leadTime, currency
    - Calculate totalPrice = refinedQty × unitPrice
    - Set itemStatus = PRICED
    - Return success/error
  - [ ] `updateBomItemPrice(itemId, newPrice)`
    - Same validation
    - Update if can re-price
  - [ ] `submitBomToProcurement(bomId)` (internal)
    - System action to mark BoM ACTIVE
    - Only after all items PRICED

### Procurement Pages
- [ ] **Procurement Layout**
  - **File**: `app/procurement/layout.js`
  - [ ] Navigation menu (BoM, Pricing Dashboard, Reports)
  - [ ] User info

- [ ] **Procurement Dashboard**
  - **File**: `app/procurement/page.js`
  - [ ] Welcome message
  - [ ] Cards:
    - [ ] "3 BoMs Awaiting Pricing"
    - [ ] "2 BoMs Fully Priced"
    - [ ] "Total Quoted Cost: Rp 123,456,789"
  - [ ] Link to BoM list

- [ ] **BoM Pricing List**
  - **File**: `app/procurement/bom/page.js`
  - [ ] Server component
  - [ ] Fetch BoMs with SYSTEM_APPROVED status
  - [ ] Table: BOM No | Project | Total Items | Priced Items | Total Cost | Actions
  - [ ] Filter: By status (awaiting, partial, complete)
  - [ ] Pagination
  - [ ] Button: [Add Pricing]

- [ ] **Pricing Page**
  - **File**: `app/procurement/bom/[bomId]/pricing/page.js`
  - [ ] Client component ("use client")
  - [ ] Display BoM header (read-only)
  - [ ] Table: Items with pricing fields
  - Columns:
    - [ ] Item # | Description | Refined Qty | Unit
    - [ ] **Unit Price** (input)
    - [ ] **Currency** (select: IDR, USD, EUR)
    - [ ] **Supplier** (input/select)
    - [ ] **Lead Time (days)** (input)
    - [ ] **Total Price** (calculated, read-only)
    - [ ] Status
  - [ ] Buttons: [Save Prices] [Submit] [Cancel]
  - [ ] Validation: prices > 0, supplier required
  - [ ] Grand total at bottom
  - [ ] Success toast on save

- [ ] **View Pricing Page**
  - **File**: `app/procurement/bom/[bomId]/view/page.js`
  - [ ] Read-only view of full priced BoM
  - [ ] Show all items with prices
  - [ ] Summary: Total Cost, Average Lead Time
  - [ ] Timeline (all approvals + pricing)
  - [ ] No edit buttons

### Components
- [ ] **BomPriceSection Component**
  - **File**: `app/components/bom/BomPriceSection.js`
  - [ ] Renders pricing input rows
  - [ ] Handles currency display
  - [ ] Auto-calculates totals
  - [ ] Props: items[], onChange, currency

- [ ] **BomCostSummary Component**
  - **File**: `app/components/bom/BomCostSummary.js`
  - [ ] Shows:
    - [ ] Total items
    - [ ] Total qty
    - [ ] Total cost
    - [ ] Average unit price
    - [ ] Highest cost item

### Testing
- [ ] **Procurement Pricing Flow**
  - [ ] Login as PROCUREMENT
  - [ ] See SYSTEM_APPROVED BoMs
  - [ ] Open pricing page
  - [ ] Add unit prices to all items
  - [ ] Select suppliers
  - [ ] Add lead times
  - [ ] Verify totals calculated
  - [ ] Click "Submit"
  - [ ] Verify BoM → ACTIVE status

- [ ] **Permission Tests**
  - [ ] PROCUREMENT cannot delete BoM items
  - [ ] PROCUREMENT cannot see marketing baseline qty differently
  - [ ] PROCUREMENT cannot approve BoM
  - [ ] Non-procurement cannot access pricing

---

## 🎨 PHASE 5: INTEGRATION & POLISH (Week 6)

### Cross-Module Integration
- [ ] **BoM in Material Request Flow**
  - [ ] Link from MR creation to select BoM items
  - [ ] Populate MR from priced BoM (future)
  - [ ] Track cost from BoM to MR

- [ ] **Navigation Updates**
  - [ ] Update main layout to include all new modules
  - [ ] Add BoM links to engineer/procurement dashboards
  - [ ] Breadcrumb navigation

### UI/UX Polish
- [ ] **Consistent Styling**
  - [ ] All BoM components use Tailwind dark mode
  - [ ] Status badges color-coded
  - [ ] Form styling consistent
  - [ ] Error messages styled

- [ ] **Loading States**
  - [ ] Skeleton screens for data-heavy pages
  - [ ] Button loading spinners
  - [ ] Progress indicators for workflows

- [ ] **Responsive Design**
  - [ ] Test on mobile (375px)
  - [ ] Test on tablet (768px)
  - [ ] Test on desktop (1280px)
  - [ ] Adjust table scroll on mobile

- [ ] **Accessibility**
  - [ ] Add ARIA labels
  - [ ] Keyboard navigation (Tab, Enter)
  - [ ] Focus states visible
  - [ ] Color contrast check

### Performance
- [ ] **Database Optimization**
  - [ ] Verify indices exist
  - [ ] Test query performance
  - [ ] Add pagination for large lists
  - [ ] Consider caching project list

- [ ] **Code Splitting**
  - [ ] Lazy load components if needed
  - [ ] Check bundle size

### Documentation
- [ ] **Code Comments**
  - [ ] Complex permission logic
  - [ ] Server Action validation
  - [ ] Component props documentation
  - [ ] Utility functions explained

- [ ] **User Guides**
  - [ ] Marketing: How to create BoM
  - [ ] Engineer Staff: How to refine items
  - [ ] Engineer WPO/System: How to approve
  - [ ] Procurement: How to add pricing

---

## 🧪 TESTING CHECKLIST

### Unit Tests
- [ ] Permission helper tests (mock user roles)
- [ ] BoM utility functions tests
- [ ] Zod schema validation tests
- [ ] Server action tests (with mocked DB)

### Integration Tests
- [ ] Complete Marketing → Engineer → Approval → Procurement flow
- [ ] Rejection flow: WPO rejects → Engineer re-submits
- [ ] Permission matrix enforcement
- [ ] Database relationship integrity

### Manual QA
- [ ] **Cross-Browser**: Chrome, Firefox, Edge, Safari
- [ ] **Devices**: Desktop, Tablet (iPad), Mobile (iPhone)
- [ ] **Dark Mode**: All components respect dark:* classes
- [ ] **Accessibility**: Keyboard-only navigation works
- [ ] **Load Testing**: 100 BoMs displayed in list
- [ ] **Data Validation**: All Zod schemas work
- [ ] **Error Cases**: Invalid inputs handled gracefully

### User Acceptance Testing (UAT)
- [ ] Marketing user: Full workflow test
- [ ] Engineer Staff: Full workflow test
- [ ] Engineer WPO: Approval workflow test
- [ ] Engineer System: Final approval test
- [ ] Procurement: Pricing workflow test
- [ ] Role-separated users: Cannot access other's data

---

## 📊 QUALITY GATES

### Before Merging to Main
- [ ] All tests pass (unit + integration)
- [ ] Build succeeds: `npm run build`
- [ ] No lint errors: `npm run lint`
- [ ] TypeScript strict mode passes (if used)
- [ ] Manual QA complete
- [ ] Code review approved by 2 developers
- [ ] Documentation updated

### Before Production Deploy
- [ ] UAT signed off by stakeholders
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Database backups tested
- [ ] Rollback plan documented
- [ ] Deployment checklist verified

---

## 🐛 KNOWN ISSUES & NOTES

- [ ] Excel export of priced BoM (Phase 6)
- [ ] Email notifications on status change (Phase 6)
- [ ] Bulk pricing upload (Phase 6)
- [ ] BoM versioning/history (Phase 6)
- [ ] Cost tracking & reporting dashboard (Phase 6)

---

## 📅 TIMELINE ESTIMATE

| Phase | Tasks | Duration | Team Size |
|-------|-------|----------|-----------|
| 1: Foundation | Schema, Prisma, Seed | 1.5 weeks | 1 dev |
| 2: Marketing | Module, pages, actions | 1 week | 1-2 devs |
| 3: Engineer | Module, approvals, components | 2 weeks | 2 devs |
| 4: Procurement | Module, pricing, actions | 1 week | 1 dev |
| 5: Integration & Polish | Cross-module, UI, testing | 1 week | 2 devs |
| **Total** | | **~6 weeks** | **2-3 devs** |

---

**Last Updated**: 2026-05-04  
**Owner**: Development Team  
**Next Review**: After Phase 1 Complete
