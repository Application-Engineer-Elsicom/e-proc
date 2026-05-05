# E-Procurement BoM System - Getting Started

## Project Overview

E-Procurement application for managing Bill of Materials (BoM) through a multi-stage workflow:

**Marketing** → Creates BoM  
**Engineer** → Refines items and approvals  
**Procurement** → Adds pricing  

This is a **collaborative workflow system** where each role has specific responsibilities and authority levels.

## Current Status

**Phase 2 (Marketing Module): ✅ COMPLETE**

The Marketing interface is fully functional. Users can create, view, edit, and manage BoM records.

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Ensure Database
```bash
npx prisma db push
```

### 3. Seed Test Data
```bash
npm run seed
```

Expected output:
```
✅ Created 5 test users
✅ Created 3 test BoMs
✨ Database seeded successfully!
```

### 4. Start Development Server
```bash
npm run dev
```

Server running at: `http://localhost:3000`

### 5. Login
```
Email: marketing@test.com
Password: password123
```

You'll be redirected to the Marketing dashboard.

## What You Can Do Now

### In Marketing Module (/marketing)
- ✅ View dashboard with statistics
- ✅ Create new BoM records
- ✅ View BoM details and items
- ✅ Edit DRAFT BoM
- ✅ Submit BoM for refinement
- ✅ Delete DRAFT BoM
- ✅ Filter BoMs by status
- ✅ View activity history

### Available Test Users
```
Email                          | Role             | Password
-------------------------------|------------------|----------
marketing@test.com             | MARKETING        | password123
engineer.staff@test.com        | ENGINEER (STAFF) | password123
engineer.wpo@test.com          | ENGINEER (WPO)   | password123
engineer.system@test.com       | ENGINEER (SYSTEM)| password123
procurement@test.com           | PROCUREMENT      | password123
```

## Key Features

### Marketing Interface
| Feature | Status | Notes |
|---------|--------|-------|
| Create BoM | ✅ | With dynamic items |
| View BoM | ✅ | With full details |
| Edit BoM | ✅ | DRAFT status only |
| Submit for Refinement | ✅ | Moves to SUBMITTED |
| Delete BoM | ✅ | DRAFT status only |
| Filter by Status | ✅ | All/Draft/Submitted/etc |
| Activity History | ✅ | Audit trail |
| Dashboard | ✅ | Statistics & recent |

### Coming Soon (Phase 3+)
| Feature | Phase | Notes |
|---------|-------|-------|
| Engineer Refinement | 3 | Item-level updates |
| WPO Approval | 3 | Quality assurance |
| System Approval | 3 | Final verification |
| Procurement Pricing | 4 | Cost management |
| Reporting | 5 | BoM analytics |

## Project Structure

```
app/
├── marketing/                  # Marketing module (Phase 2)
│   ├── layout.js              # Layout with nav
│   ├── page.js                # Dashboard
│   └── bom/
│       ├── page.js            # BoM list
│       ├── create/
│       │   └── page.js        # Create form
│       └── [bomId]/
│           └── page.js        # View/Edit detail
├── engineer/                   # Engineer module (Phase 3 - planned)
├── procurement/               # Procurement module (Phase 4 - planned)
├── actions/
│   └── bom.js                # Server actions
├── api/
│   └── auth/                 # NextAuth setup
└── lib/
    ├── prisma.js            # Database client
    ├── permissions.js       # Permission checking
    ├── bom-utils.js         # Utility functions
    └── zod-schemas.js       # Validation schemas
```

## Documentation

### Quick References
1. **GETTING_STARTED.md** (this file) - Quick setup and overview
2. **PHASE2_UPDATE_SUMMARY.md** - What's new in Phase 2
3. **PHASE2_CHECKLIST.md** - Implementation checklist

### Detailed Guides
1. **PHASE2_COMPLETE.md** - Architecture and features
2. **PHASE2_TESTING.md** - 10 test scenarios with steps
3. **BoM_FEATURE_PLAN.md** - Original feature design
4. **BoM_DATA_FLOW.md** - Data flow diagrams

### Technical
1. **PHASE1_SUMMARY.txt** - Phase 1 foundation
2. **PHASE1_STEP2_COMPLETE.md** - Library functions
3. **SETUP_STATUS.txt** - Initial setup status

## Technology Stack

**Frontend**
- Next.js 15 (App Router)
- React 19
- React Hook Form
- Tailwind CSS
- TypeScript ready

**Backend**
- Next.js Server Components
- Server Actions
- NextAuth.js (authentication)
- Prisma ORM

**Database**
- MySQL (Laragon)
- Prisma schema

**Validation**
- Zod (schema validation)

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Database
npx prisma db push     # Sync schema to database
npx prisma studio     # Open Prisma Studio UI
npm run seed           # Populate test data

# Code Quality
npm run lint           # Check code with Biome
npm run format         # Format code with Biome
```

## File Locations

| Purpose | Location |
|---------|----------|
| Marketing pages | `app/marketing/` |
| Server actions | `app/actions/bom.js` |
| Database models | `prisma/schema.prisma` |
| Permission checking | `app/lib/permissions.js` |
| Utilities | `app/lib/bom-utils.js` |
| Validation | `app/lib/zod-schemas.js` |
| Test data | `app/lib/seed.js` |
| Configuration | `.env` |

## Troubleshooting

### MySQL Connection Error
**Problem**: "Can't reach database server"
```
✅ Solution: Start MySQL in Laragon
✅ Check DATABASE_URL in .env
```

### Seed Script Fails
**Problem**: `npm run seed` gives error
```
✅ Solution: Run `npx prisma db push` first
✅ Ensure MySQL is running
```

### Login Fails
**Problem**: Cannot login with test credentials
```
✅ Solution: Run seed script: npm run seed
✅ Clear browser cookies
✅ Check .env DATABASE_URL
```

### Pages Show 404
**Problem**: Routes not found
```
✅ Solution: Ensure npm install completed
✅ Check file paths match structure
✅ Restart dev server
```

For detailed troubleshooting → See **PHASE2_TESTING.md**

## Testing

### Quick Test
```bash
npm run dev
# Login: marketing@test.com / password123
# Click "Create New BoM"
# Fill in fields and submit
# View result in BoM List
```

### Full Test Suite
See **PHASE2_TESTING.md** for:
- 10 detailed test scenarios
- Step-by-step instructions
- Expected results for each
- Troubleshooting guide

## Architecture Overview

### Authentication Flow
```
Login → NextAuth Session → Check Role → Redirect to Module
                                    ↓
                            marketing → /marketing
                            engineer → /engineer
                            procurement → /procurement
```

### BoM Workflow (Current)
```
DRAFT (Marketing creates)
  ↓
SUBMITTED (Marketing submits)
  ↓
[Engineer Module - Phase 3 to handle refinement & approval]
  ↓
WPO_REVIEW → WPO_APPROVED
  ↓
SYSTEM_REVIEW → SYSTEM_APPROVED
  ↓
ACTIVE (Ready for Procurement)
  ↓
[Procurement Module - Phase 4 to add pricing]
  ↓
ARCHIVED (Historical record)
```

### Data Relationships
```
User (n)
  ↓
  ├─ creates many → BillOfMaterial
  └─ performs many → BomHistory

BillOfMaterial (1)
  ├─ has many → BomItem (dynamic list)
  └─ has many → BomHistory (audit trail)

BomItem
  └─ belongs to BillOfMaterial
```

## Development Workflow

### Creating Features
1. **Design**: Plan in markdown files
2. **Database**: Update Prisma schema
3. **Backend**: Create server actions
4. **Frontend**: Build UI components
5. **Validation**: Add Zod schemas
6. **Test**: Run test scenarios
7. **Document**: Update docs

### Example: Creating a New Feature
```typescript
// 1. Add to schema (prisma/schema.prisma)
model BomApproval { ... }

// 2. Create action (app/actions/bom.js)
export async function approveBom(bomId) { ... }

// 3. Build UI (app/path/page.js)
<button onClick={approveBom}>Approve</button>

// 4. Add validation (app/lib/zod-schemas.js)
const ApprovalSchema = z.object({ ... })

// 5. Test it
// 6. Document changes
```

## Performance Notes

- Dashboard calculations: Real-time (no caching)
- List queries: Optimized with indexes
- Detail pages: Single query with relations
- Forms: Client validation before server

## Security Considerations

- Role-based access control
- Creator-based authorization
- Server-side permission checks
- Secure password hashing (bcryptjs)
- Protected API routes
- Session-based authentication

## Next Phase (Phase 3)

When ready to implement Engineer Module:

1. **Create Engineer pages**:
   - `/engineer` (dashboard)
   - `/engineer/bom` (list)
   - `/engineer/bom/[bomId]/refine` (refinement interface)

2. **Implement refinement logic**:
   - Allow item-level updates
   - Track changes in history
   - Support rejection workflow

3. **Add approval workflows**:
   - WPO review and approval
   - System review and approval
   - Rejection and resubmission

4. **Test thoroughly**:
   - Full workflow from create to approval
   - Edge cases and rejections
   - Permission enforcement

All utilities and schemas are ready:
- ✅ `canRefineBoM()` permission function
- ✅ `BomItemRefineSchema` validation
- ✅ Utility functions for calculations
- ✅ Test data with various statuses

## Support & Questions

For issues or questions:
1. Check **PHASE2_TESTING.md** for common issues
2. Review relevant phase documentation
3. Check browser console for errors
4. Inspect database with `npx prisma studio`

## Project Timeline

| Phase | Status | Focus |
|-------|--------|-------|
| Phase 1 | ✅ | Database + Utilities |
| Phase 2 | ✅ | Marketing UI |
| Phase 3 | 🚀 | Engineer Module |
| Phase 4 | 📅 | Procurement Module |
| Phase 5 | 📅 | Polish & Reports |

## Summary

You now have a **working BoM system** for the marketing workflow. 

**Next**: Run the commands in "Quick Start" above, login, and explore!

**Questions**: See documentation files in project root.

**Ready to extend**: All code is modular and well-documented for Phase 3.

---

**Happy coding! 🚀**

Last Updated: 2026-05-04  
Status: Phase 2 Complete
