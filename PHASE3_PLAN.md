# Phase 3: Engineer Module - Implementation Plan

## Overview
Engineer Module untuk BoM refinement dan approval workflow. 3 role engineer dengan responsibility berbeda:
- **Engineer STAFF**: Refine item details (qty, specifications)
- **Engineer WPO**: Approve refined items (quality check)
- **Engineer SYSTEM**: Final approval & activate BoM

## Workflow

```
SUBMITTED (from Marketing)
    ↓
Engineer STAFF refines items
    ↓ (all items refined)
WPO_REVIEW (waiting WPO approval)
    ↓
Engineer WPO approves/rejects
    ↓ (approved)
SYSTEM_REVIEW (waiting System approval)
    ↓
Engineer SYSTEM approves/activates
    ↓
ACTIVE (ready for Procurement)
```

## Pages to Create

### 1. Engineer Layout & Dashboard
**File**: `app/engineer/layout.js`
- Role-based auth (ENGINEER only)
- Navigation menu (Dashboard, BoM List, My Tasks)
- Sticky header with user info

**File**: `app/engineer/page.js` (Dashboard)
- Statistics: Total, Pending Refinement, Waiting WPO, Waiting System, Active
- Tasks assigned to current user based on engineerRole
- Recent BoMs in current workflow stage
- Action buttons (Refine, Approve, Activate)

### 2. Engineer BoM List
**File**: `app/engineer/bom/page.js`
- Filter by status: All, Submitted, WPO Review, WPO Approved, System Review, System Approved, Active
- Filter by assignee: Assigned to me / All
- Table: BoM#, Project, Items, Current Status, Assigned To, Actions
- Quick actions: View, Refine, Approve, Activate (based on role)

### 3. BoM Refinement Page
**File**: `app/engineer/bom/[bomId]/refine/page.js`
- View mode: See marketing items
- Edit mode: Refine each item
- Item refinement table with:
  - Item description (read-only from marketing)
  - Marketing qty (read-only)
  - Refined qty (editable by STAFF)
  - Specifications (new field, editable)
  - Notes/Comments (editable)
  - Item status (PENDING → REFINED)
- Request info button: Send message to marketing
- Submit for approval button: Move to WPO_REVIEW
- Reject button: Send back to DRAFT with reason

### 4. Approval Pages
**File**: `app/engineer/bom/[bomId]/approve/page.js`
- View refined BoM
- Show all refinements from STAFF
- WPO actions:
  - Approve all items → SYSTEM_REVIEW
  - Reject item(s) → back to refinement
  - Request clarification → comment on item
- SYSTEM actions:
  - Final approval → ACTIVE
  - Reject → back to refinement
  - View pricing (from procurement if available)

## Database Changes

### New/Updated Models

**BomItem** (UPDATE)
```
refinedQty: Int?
specifications: String?
refinedBy: String?  // Engineer STAFF user ID
refinedAt: DateTime?
notes: String?
```

**BomItemComment** (NEW)
```
id: String @id
bomItemId: String
bomId: String
userId: String
message: String
createdAt: DateTime
```

**BillOfMaterial** (UPDATE)
```
assignedToStaff: String?    // Engineer STAFF user ID
assignedToWpo: String?      // Engineer WPO user ID
assignedToSystem: String?   // Engineer SYSTEM user ID
refinementStartedAt: DateTime?
```

## Server Actions

### app/actions/engineer.js (NEW)

Functions needed:
- `getSubmittedBoms()` - Get BoMs waiting for refinement
- `refineBomItem(bomId, itemId, refinement)` - Update item refinement
- `submitBomForApproval(bomId)` - Mark all items refined, move to WPO_REVIEW
- `requestInfoFromMarketing(bomId, itemId, message)` - Add comment
- `approveBomByWpo(bomId, rejectionReasons?)` - WPO approval
- `approveBomBySystem(bomId)` - System approval & activate
- `rejectBomItem(bomId, itemId, reason)` - Send back to refinement
- `getBomForRefinement(bomId)` - Fetch with full item details
- `getEngineerDashboardStats(userId)` - Get stats for dashboard

## UI Components

### Refinement Table
- Dynamic rows for each item
- Inline editing for refined qty, specs, notes
- Status badge for each item
- Actions: Remove, Request Info, View History
- Add Row button (optional - for new items)

### Approval Checklist
- Per-item approval/rejection
- Comments/feedback area
- Overall approval/rejection button
- Confirmation dialog

### Comments Section
- Timeline of all comments
- Filter by type: All, Questions, Rejections, Approvals
- Reply functionality (optional for Phase 3)

## Validation

### BomItemRefineSchema
```
refinedQty: number > 0
specifications: string (optional but recommended)
notes: string (optional)
```

### BomApprovalSchema
```
bomId: string
rejectionReasons: object (map itemId → reason)
approvalNotes: string (optional)
```

## Permissions

Existing functions in `app/lib/permissions.js`:
- ✅ `canRefineBoM(user, bom)` - STAFF only, can refine items
- ✅ `canApproveWPO(user, bom)` - WPO only, can approve refined
- ✅ `canApproveSystem(user, bom)` - SYSTEM only, can activate
- ✅ `isEngineerStaff(user)` - Check if ENGINEER role with STAFF sub-role
- ✅ `isEngineerWPO(user)`
- ✅ `isEngineerSystem(user)`

## Status Transitions

Current enum values in schema:
```
DRAFT (Marketing creates)
SUBMITTED (Marketing submits)
WPO_REVIEW (Engineer STAFF refines)
WPO_APPROVED (Engineer WPO approves)
SYSTEM_REVIEW (waiting System)
SYSTEM_APPROVED (System approves)
REJECTED (Any engineer rejects)
ACTIVE (Ready for Procurement)
ARCHIVED (Marketing archives after use)
```

## Testing Data

Existing test BoMs:
- BOM-001-2025: DRAFT (use for create flow test)
- BOM-002-2025: SUBMITTED (ready for refinement)
- BOM-003-2025: WPO_REVIEW (already under WPO review)

Test engineers:
- engineer.staff@test.com (ENGINEER/STAFF)
- engineer.wpo@test.com (ENGINEER/WPO)
- engineer.system@test.com (ENGINEER/SYSTEM)

## Deliverables

- [ ] Engineer Layout with navigation
- [ ] Engineer Dashboard with task list
- [ ] Engineer BoM List with filtering
- [ ] BoM Refinement page (STAFF)
- [ ] BoM Approval page (WPO & SYSTEM)
- [ ] Server actions for all operations
- [ ] Comments/feedback system
- [ ] History tracking for refinements
- [ ] Status transition logic
- [ ] Test documentation
- [ ] 10+ test scenarios

## Timeline

- Layout & Dashboard: ~2 hours
- BoM List: ~1.5 hours
- Refinement page: ~3 hours
- Approval pages: ~2 hours
- Server actions & logic: ~2 hours
- Testing & polish: ~1.5 hours

**Total**: ~12 hours of development

## Success Criteria

- ✅ Engineer STAFF can refine items
- ✅ Engineer WPO can approve refinements
- ✅ Engineer SYSTEM can activate BoM
- ✅ Full workflow works: SUBMITTED → ACTIVE
- ✅ All status transitions work
- ✅ Permissions enforced
- ✅ History logged for all actions
- ✅ No errors in console
- ✅ Responsive design
- ✅ Dark mode works

## Notes

- Phase 3a: Core refinement & approval flow
- Phase 3b (Optional): Comments/discussion system
- Phase 3c (Optional): Bulk actions, templates
- Phase 4: Procurement module (pricing)
