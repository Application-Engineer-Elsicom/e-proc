# Phase 3: Engineer Module - Testing Documentation

## Overview
Phase 3 implements the Engineer Module for BoM refinement and approval workflows. Three engineer roles manage the process:
- **STAFF**: Refines item details (qty, specifications)
- **WPO**: Approves refined items (quality check)
- **SYSTEM**: Final approval & activate BoM

## Test Credentials

All passwords: `password123`

| Role | Username | Email | Access |
|------|----------|-------|--------|
| Engineer STAFF | engineer.staff@test.com | Refinement interface | app/engineer/bom/[id]/refine |
| Engineer WPO | engineer.wpo@test.com | Approval interface | app/engineer/bom/[id]/approve |
| Engineer SYSTEM | engineer.system@test.com | Activation interface | app/engineer/bom/[id]/approve |
| Marketing | marketing@test.com | BoM creation | app/marketing |

## Workflow Status Transitions

```
SUBMITTED (from Marketing)
    ↓
STAFF refines items → WPO_REVIEW
    ↓
WPO approves/rejects → SYSTEM_REVIEW
    ↓
SYSTEM approves/activates → ACTIVE
```

## Test Scenarios

### Test 1: View Engineer Dashboard
**Role**: Any Engineer
**Steps**:
1. Login as any engineer (e.g., engineer.staff@test.com)
2. Navigate to /engineer
3. Verify dashboard shows:
   - Statistics (Pending, In Progress, Waiting, Completed)
   - Task list with role-specific items
   - Recent BoMs in current status
   - Quick action buttons

**Expected Result**: Dashboard loads with correct statistics and tasks for engineer role

---

### Test 2: View Engineer BoM List
**Role**: Any Engineer
**Steps**:
1. Login as engineer.staff@test.com
2. Click "BoM List" or navigate to /engineer/bom
3. Verify:
   - Status filter shows "Needs Refinement" (SUBMITTED)
   - BoM-002-2025 and BOM-003-2025 are listed
   - Table shows BoM#, Project, Items, Status, From, Actions
4. Switch to engineer.wpo@test.com
5. Verify status filter changes to "Needs Approval" (WPO_REVIEW)
6. Switch to engineer.system@test.com
7. Verify status filter changes to "Needs Activation" (SYSTEM_REVIEW)

**Expected Result**: Each role sees appropriate status filter and BoMs

---

### Test 3: Refine BoM Items (STAFF)
**Role**: Engineer STAFF
**Steps**:
1. Login as engineer.staff@test.com
2. Go to /engineer/bom and click "Refine" on BOM-002-2025
3. Click "Edit" on first item (Ceramic Tiles)
4. Fill in:
   - Refined Qty: 1200
   - Specifications: "60x60cm ceramic tiles, Grade A, slip-resistant finish"
   - Notes: "Confirmed with supplier, delivery in 2 weeks"
5. Click "Save"
6. Verify item status changes to "REFINED" (green badge)
7. Repeat for remaining items

**Expected Result**: Items save with REFINED status, form closes

---

### Test 4: Submit BoM for Approval (STAFF)
**Role**: Engineer STAFF
**Steps**:
1. After refining all items in Test 3
2. Verify "Submit for Approval" button is enabled
3. Click "Submit for Approval"
4. Confirm action in dialog
5. Verify redirect to /engineer/bom
6. Check BOM-002-2025 status changed to WPO_REVIEW

**Expected Result**: BoM status changes to WPO_REVIEW, REFINEMENT_COMPLETE history entry created

---

### Test 5: Approve BoM (WPO)
**Role**: Engineer WPO
**Steps**:
1. Login as engineer.wpo@test.com
2. Go to /engineer/bom (should show WPO_REVIEW as default)
3. Click "Approve" on BOM-002-2025
4. Verify refined items are displayed with specifications
5. Add remarks: "All items meet quality standards"
6. Click "Approve & Move to System"
7. Confirm action

**Expected Result**: BoM status changes to SYSTEM_REVIEW, WPO_APPROVED history entry created

---

### Test 6: Reject Item (WPO)
**Role**: Engineer WPO
**Steps**:
1. Login as engineer.wpo@test.com
2. Navigate to a BoM in WPO_REVIEW (e.g., BOM-003-2025)
3. Click "Reject" button on second item (Base Course Material)
4. Enter reason: "Qty specification doesn't match industry standard"
5. Click "Confirm Rejection"
6. Verify redirect and item status changed to REJECTED

**Expected Result**: Item marked as REJECTED, ITEM_REJECTED history entry created

---

### Test 7: Activate BoM (SYSTEM)
**Role**: Engineer SYSTEM
**Steps**:
1. Login as engineer.system@test.com
2. Go to /engineer/bom (should show SYSTEM_REVIEW as default)
3. Click "Activate" on a BoM in SYSTEM_REVIEW
4. Verify all refined items are displayed
5. Add remarks: "All items checked and approved for procurement"
6. Click "Activate BoM"
7. Confirm action

**Expected Result**: BoM status changes to ACTIVE, SYSTEM_APPROVED history entry created, all items marked as APPROVED

---

### Test 8: Reject BoM (STAFF)
**Role**: Engineer STAFF
**Steps**:
1. Login as engineer.staff@test.com
2. Navigate to a SUBMITTED BoM
3. Click "Reject" button on refinement page
4. Enter reason: "Marketing provided incomplete specifications"
5. Click "Confirm Rejection"
6. Verify BoM status changes to REJECTED

**Expected Result**: BoM marked as REJECTED, BOM_REJECTED history entry created

---

### Test 9: Verify Role-Based Access Control
**Role**: Mixed
**Steps**:
1. Login as engineer.staff@test.com
2. Try to access /engineer/bom/[id]/approve → Should redirect or deny
3. Logout and login as engineer.wpo@test.com
4. Try to access /engineer/bom/[id]/refine → Should show approval view, not refinement
5. Verify each role only sees appropriate status filters

**Expected Result**: Proper access control, no cross-role visibility

---

### Test 10: Full Workflow Integration
**Role**: All Engineers (sequential)
**Steps**:
1. **Marketing** (prep): Login as marketing@test.com
   - Navigate to /marketing/bom/BOM-002-2025
   - Click "Submit" to move to SUBMITTED status
   
2. **STAFF** (refine): Login as engineer.staff@test.com
   - Go to /engineer/bom?status=SUBMITTED
   - Click "Refine" on BOM-002-2025
   - Edit and refine all items
   - Click "Submit for Approval"
   
3. **WPO** (approve): Login as engineer.wpo@test.com
   - Go to /engineer/bom?status=WPO_REVIEW
   - Click "Approve" on BOM-002-2025
   - Add remarks and approve
   
4. **SYSTEM** (activate): Login as engineer.system@test.com
   - Go to /engineer/bom?status=SYSTEM_REVIEW
   - Click "Activate" on BOM-002-2025
   - Add remarks and activate
   
5. **Verification**: Check final status
   - Status should be ACTIVE
   - All items should be APPROVED
   - Complete workflow history should be in audit trail

**Expected Result**: Complete workflow succeeds, BoM becomes ACTIVE

---

### Test 11: History Audit Trail
**Role**: Any Engineer
**Steps**:
1. After completing Test 10 (full workflow)
2. Login as any engineer
3. Navigate to a completed BoM detail page
4. Scroll to "History" section
5. Verify entries for:
   - CREATED (Marketing)
   - SUBMITTED (Marketing)
   - REFINEMENT_COMPLETE (STAFF)
   - WPO_APPROVED (WPO)
   - SYSTEM_APPROVED (SYSTEM)
6. Verify each entry shows performer, timestamp, and details

**Expected Result**: Complete audit trail visible with all actions recorded

---

### Test 12: Item Comments
**Role**: WPO/SYSTEM
**Steps**:
1. Login as engineer.wpo@test.com
2. Navigate to /engineer/bom/[id]/approve
3. Click "Add Comment" on an item
4. Type comment: "Quantity should be confirmed with supplier"
5. Press Enter or click button
6. Verify comment appears in item section
7. Verify comment shows author, timestamp

**Expected Result**: Comments save and display correctly with metadata

---

### Test 13: Dark Mode
**Role**: Any Engineer
**Steps**:
1. Login as any engineer
2. Navigate to /engineer
3. Verify light mode displays correctly
4. Toggle dark mode (system preference or app toggle)
5. Navigate to /engineer/bom, refinement page, approval page
6. Verify all pages render correctly in dark mode
7. Check colors, contrast, and readability

**Expected Result**: All pages render properly in dark mode with good contrast

---

### Test 14: Responsive Design
**Role**: Any Engineer
**Steps**:
1. Login as any engineer
2. Navigate to /engineer/bom
3. Open browser dev tools (F12)
4. Test responsive breakpoints:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1280px)
5. Verify:
   - Navigation menu responsive
   - Table scrollable on mobile
   - Forms stacked properly on mobile
   - All buttons accessible and clickable

**Expected Result**: Responsive design works across all breakpoints

---

### Test 15: Permission Enforcement
**Role**: Any Engineer
**Steps**:
1. Login as engineer.staff@test.com (STAFF)
2. Intercept request to /api/actions/engineer
3. Try calling `approveBomByWpo()` directly
4. Verify permission check returns error
5. Repeat for other role/action combinations:
   - STAFF trying to approve
   - WPO trying to refine
   - SYSTEM trying to refine

**Expected Result**: All permission checks pass, unauthorized actions are rejected

---

## Database Verification

### Check Schema Updates
```sql
-- Verify BomItem schema
DESCRIBE BomItem;
-- Should have: specifications, refinedBy, refinedAtStaff, refinedByWpo, refinedAtWpo, refinedBySystem, refinedAtSystem

-- Verify BillOfMaterial schema
DESCRIBE BillOfMaterial;
-- Should have: assignedToStaff, assignedToWpo, assignedToSystem, refinementStartedAt
```

### Check Test Data
```sql
-- Verify test BoMs exist
SELECT bomNo, projectName, bomStatus FROM BillOfMaterial WHERE bomNo LIKE 'BOM-%';

-- Verify items loaded
SELECT COUNT(*) FROM BomItem WHERE bomId IN (SELECT id FROM BillOfMaterial);

-- Verify history entries
SELECT action, COUNT(*) FROM BomHistory GROUP BY action;
```

---

## Error Scenarios

### Test E1: Submit with Unrefined Items
**Role**: Engineer STAFF
**Steps**:
1. Go to refinement page for SUBMITTED BoM
2. Refine only one item (leave others PENDING)
3. Click "Submit for Approval"
4. Verify error message: "All items must be refined before submission"

**Expected Result**: Validation error, submission prevented

---

### Test E2: Approve with Invalid Data
**Role**: Engineer WPO
**Steps**:
1. Navigate to approval page
2. Try to reject item without reason
3. Verify error: "Please provide a rejection reason"

**Expected Result**: Validation prevents submission

---

### Test E3: Concurrent Modifications
**Role**: Two browsers/users
**Steps**:
1. Open BoM in two browser windows (STAFF and WPO)
2. STAFF: Start refining item 1
3. WPO: Try to approve the same BoM
4. Verify system handles conflict gracefully

**Expected Result**: Proper concurrency handling, no data corruption

---

## Performance Tests

### Test P1: Load Large BoM
**Steps**:
1. Create BoM with 50+ items
2. Navigate to refinement page
3. Measure load time (should be <2s)
4. Verify table scrolls smoothly
5. Test form submission performance

**Expected Result**: Acceptable performance for large datasets

---

## Accessibility Tests

### Test A1: Keyboard Navigation
**Steps**:
1. Login to app
2. Tab through refinement page
3. Verify all buttons/forms accessible via keyboard
4. Verify Tab order is logical

**Expected Result**: Full keyboard navigation support

---

## Summary

- **Total Test Scenarios**: 15 + 3 error + 2 performance + 1 accessibility = 21 tests
- **Success Criteria**:
  ✅ All role-based workflows work
  ✅ Permission enforcement enforced
  ✅ Data persistence verified
  ✅ Audit trail complete
  ✅ UI responsive and accessible
  ✅ Error handling graceful
  ✅ Performance acceptable

---

## Notes

- All test data available in seed.cjs
- Test environment uses SQLite in-memory DB for CI/CD
- Production uses MySQL via Laragon
- All timestamps recorded in UTC
- Concurrent access handled via Prisma optimistic locking
