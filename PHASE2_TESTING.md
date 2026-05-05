# Phase 2 Testing Guide - Marketing Module

## Prerequisites
- Node.js 18+ installed
- MySQL running in Laragon
- Project dependencies installed

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

This installs:
- New dependency: zod (validation schema library)
- New dependency: tsx (TypeScript execution for seed script)

### 2. Verify Database Connection
Make sure your MySQL is running in Laragon and `.env` file has correct connection:
```
DATABASE_URL="mysql://root:@localhost:3306/e_proc"
```

### 3. Push Database Schema
```bash
npx prisma db push
```

This ensures all tables (including existing ones) are created/updated.

### 4. Seed Test Data
```bash
npm run seed
```

This creates:
- 5 test users with different roles
- 3 test BoMs with different statuses
- Sample items and audit history

Expected output:
```
🌱 Seeding database...
Clearing existing data...
Creating test users...
✅ Created 5 test users
   - Marketing: marketing@test.com
   - Engineer (Staff): engineer.staff@test.com
   - Engineer (WPO): engineer.wpo@test.com
   - Engineer (System): engineer.system@test.com
   - Procurement: procurement@test.com

Creating test BoMs...
✅ Created 3 test BoMs
   - BOM-001-2025: Draft (3 items)
   - BOM-002-2025: Submitted (4 items)
   - BOM-003-2025: WPO Review (3 items)

✨ Database seeded successfully!

📝 Test Credentials:
   Email: marketing@test.com | Role: MARKETING
   Email: engineer.staff@test.com | Role: ENGINEER (STAFF)
   ...
   Password: password123
```

### 5. Start Development Server
```bash
npm run dev
```

Server will start at `http://localhost:3000`

## Test Scenarios

### Scenario 1: View Dashboard
**Path**: `http://localhost:3000/marketing`
**Steps**:
1. Login with: `marketing@test.com` / `password123`
2. Should see:
   - Welcome section with user name
   - 5 statistics cards showing counts
   - Recent BoMs table with 3 sample BoMs
3. Click "Create New BoM" button → Should redirect to create form

**Expected Results**:
- ✅ Dashboard loads without errors
- ✅ Statistics are calculated correctly
- ✅ Recent BoMs table displays seeded data
- ✅ Navigation buttons work

### Scenario 2: Filter BoM List
**Path**: `http://localhost:3000/marketing/bom`
**Steps**:
1. Click "BoM List" in navigation
2. See all 3 BoMs with "All" filter active
3. Click "Draft" filter
   - Should show only BOM-001-2025 (1 item)
4. Click "Submitted" filter
   - Should show only BOM-002-2025 (1 item)
5. Click "WPO Review" filter (if available)
   - Should show only BOM-003-2025 (1 item)
6. Click "All" to reset

**Expected Results**:
- ✅ Filters work correctly
- ✅ Correct BoMs display for each filter
- ✅ Row counts update based on filter
- ✅ Active filter is highlighted

### Scenario 3: View BoM Detail
**Path**: `http://localhost:3000/marketing/bom/[bomId]`
**Steps**:
1. On BoM List page, click "View" on any BoM
2. Should see:
   - BoM header with status badge
   - Project information section (read-only)
   - Items table with all items
   - Activity history timeline
3. For DRAFT BoM (BOM-001):
   - Should see Edit, Submit, Delete buttons
4. For SUBMITTED/approved BoMs:
   - Should only see Back button

**Expected Results**:
- ✅ All BoM details display correctly
- ✅ Items show with their properties
- ✅ History timeline shows creation and submission
- ✅ Action buttons appear only for DRAFT
- ✅ Status badges have correct colors

### Scenario 4: Edit Draft BoM
**Path**: `http://localhost:3000/marketing/bom/[bomId]` (DRAFT BoM)
**Steps**:
1. View a DRAFT BoM (BOM-001-2025)
2. Click "Edit" button
   - Page should switch to edit mode
   - Form should be populated with existing data
3. Modify data:
   - Change project name
   - Change one item's description
   - Change quantity
4. Click "Add Row" to add new item
5. Fill in new item details
6. Click "Save Changes"
   - Should see success message
   - Page returns to view mode
   - Changes are visible in details
7. Check Activity History:
   - Should show "UPDATED" entry

**Expected Results**:
- ✅ Edit mode loads with existing data
- ✅ Form fields are editable
- ✅ Add/Delete row functionality works
- ✅ Save operation succeeds
- ✅ Changes persist in database
- ✅ History records the update
- ✅ Can cancel without saving

### Scenario 5: Create New BoM
**Path**: `http://localhost:3000/marketing/bom/create`
**Steps**:
1. Click "Create New BoM" button (from dashboard or list)
2. Fill in project information:
   - Project ID: `PROJ-NEW-001`
   - Project Code: `9999`
   - Project Name: `Test Project - Scenario 5`
   - Contract No: `CONTRACT-TEST-001` (optional)
   - Description: `Testing new BoM creation` (optional)
3. Fill in first item:
   - Description: `Test Material 1`
   - Quantity: `100`
   - Unit: `Pcs` (default)
4. Click "Add Row"
5. Fill in second item:
   - Description: `Test Material 2`
   - Quantity: `50`
   - Unit: `Kg`
6. Click "Create BoM"
   - Should see success message with BoM number
   - Should redirect to BoM List
7. Verify in list:
   - New BoM appears at top (newest first)
   - Status shows "Draft"
   - Items count shows 2

**Expected Results**:
- ✅ Form validates and accepts input
- ✅ BoM is created with unique bomNo
- ✅ Items are saved with BoM
- ✅ Success message displays BoM number
- ✅ New BoM appears in list
- ✅ Audit history records creation

### Scenario 6: Submit BoM for Refinement
**Path**: `http://localhost:3000/marketing/bom/[bomId]` (DRAFT BoM)
**Steps**:
1. View a DRAFT BoM
2. Click "Submit for Refinement" button
   - Should see confirmation
3. Page updates:
   - Status changes to "Submitted"
   - Action buttons disappear (only Back button)
4. Go back to BoM List
   - BoM status now shows "Submitted" instead of "Draft"
5. Check Activity History:
   - Should show "SUBMITTED" entry

**Expected Results**:
- ✅ Status transitions from DRAFT to SUBMITTED
- ✅ UI updates to reflect new status
- ✅ Action buttons become unavailable
- ✅ History records the submission
- ✅ Cannot edit after submission

### Scenario 7: Delete BoM
**Path**: `http://localhost:3000/marketing/bom/[bomId]` (DRAFT BoM)
**Steps**:
1. View a DRAFT BoM (prefer one you created)
2. Click "Delete" button
   - Should show confirmation dialog
3. Confirm deletion
   - Success message should appear
   - Should redirect to BoM List
4. Verify deletion:
   - BoM no longer appears in list
   - Item count decreases

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Only DRAFT BoMs can be deleted
- ✅ BoM and related items are deleted
- ✅ Deletion is recorded in history (if history kept)
- ✅ List updates immediately

### Scenario 8: Test Dark Mode
**All Pages**
**Steps**:
1. Look for dark mode toggle (usually in header)
2. Toggle between light and dark mode
3. Verify all pages display correctly
4. Check readability:
   - Text contrast
   - Color badges
   - Form inputs
   - Tables

**Expected Results**:
- ✅ Dark mode toggle works
- ✅ All colors are appropriate for dark theme
- ✅ Tailwind dark: classes apply correctly
- ✅ No readability issues

### Scenario 9: Test Responsive Design
**All Pages**
**Steps**:
1. Open any page in desktop (1920px)
2. Use DevTools to test:
   - Tablet (768px)
   - Mobile (375px)
3. Verify layout:
   - Grid columns stack on mobile
   - Tables scroll horizontally on small screens
   - Buttons remain clickable
   - Navigation adapts

**Expected Results**:
- ✅ Layout responsive on all sizes
- ✅ Mobile-friendly interface
- ✅ Horizontal scroll for tables
- ✅ Touch-friendly buttons

### Scenario 10: Test Invalid Access
**Authorization**
**Steps**:
1. Try accessing `/marketing/bom` as different user:
   - Engineer user: `engineer.staff@test.com`
   - Procurement user: `procurement@test.com`
2. Should be redirected to `/engineer` or appropriate role page
3. Try accessing `/marketing` directly with non-marketing user
   - Should redirect to non-marketing dashboard

**Expected Results**:
- ✅ Non-marketing users cannot access marketing module
- ✅ Proper redirects to role-appropriate pages
- ✅ Permission system works

## Troubleshooting

### Seed script fails
**Problem**: `npm run seed` doesn't work
**Solutions**:
1. Ensure MySQL is running: Check Laragon
2. Check DATABASE_URL in .env
3. Run `npx prisma db push` first
4. Delete all data: `npx prisma db reset`

### Login fails
**Problem**: Cannot login with test credentials
**Solutions**:
1. Run seed script again
2. Check database has users table populated
3. Check NextAuth configuration

### Pages show "Not authenticated"
**Problem**: Always redirected to login
**Solutions**:
1. Clear browser cookies
2. Check NextAuth session configuration
3. Verify JWT secret in .env.local

### Form submission fails
**Problem**: Create/Update form gives error
**Solutions**:
1. Check browser console for error details
2. Ensure all required fields are filled
3. Verify server action is deployed
4. Check Prisma client is connected

### Database connection error
**Problem**: "Can't reach database server"
**Solutions**:
1. Start MySQL in Laragon
2. Verify DATABASE_URL is correct
3. Test connection: `npx prisma studio`

## Performance Testing

### Load Testing
- Create many BoMs (50+)
- Check list page loads quickly
- Verify filtering still works
- Monitor database queries

### Data Integrity
- Create and edit BoM
- Delete and recreate with same data
- Verify no orphaned items
- Check history completeness

## Acceptance Criteria

All of these should pass:
- [ ] Dashboard loads with correct statistics
- [ ] BoM List displays seeded BoMs
- [ ] Filtering works for all statuses
- [ ] Can create new BoM with items
- [ ] Can view BoM details and history
- [ ] Can edit DRAFT BoM
- [ ] Can submit BoM (status changes)
- [ ] Can delete DRAFT BoM
- [ ] Cannot edit non-DRAFT BoM
- [ ] Non-marketing users cannot access
- [ ] Dark mode works on all pages
- [ ] Responsive design on mobile/tablet
- [ ] No console errors
- [ ] Database stays consistent

## Summary

Phase 2 testing verifies:
1. ✅ Marketing module is complete and functional
2. ✅ Full CRUD operations work
3. ✅ Status workflow is correct
4. ✅ Permission system is enforced
5. ✅ UI is responsive and accessible
6. ✅ Data is persisted and audited

After all tests pass, Phase 3 (Engineer Module) can begin!
