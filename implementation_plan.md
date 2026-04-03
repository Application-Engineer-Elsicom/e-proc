# E-Procurement ERP Development Plan (Engineer Module)

This document serves as the master blueprint for completing the **Engineer Interface** of the E-Procurement ERP application. It is specifically designed to provide clear, unambiguous instructions for AI agents to follow, ensuring high-quality, maintainable code even when using cost-effective models.

## Current State Analysis
- **Framework:** Next.js 15 (App Router).
- **Styling:** Tailwind CSS (Dark Mode implemented).
- **Database:** Prisma ORM connected to MySQL.
- **Authentication:** NextAuth implemented for role-based access control (`ENGINEER` role).
- **UI:** The Engineer UI (`/engineer`, `/engineer/material-request`, `/engineer/material-request/create`) is currently built with **static/hardcoded data** and uncontrolled inputs.

## ⚠️ User Review Required

> [!IMPORTANT]  
> Please review the proposed **Prisma Schema Updates** and **Architecture Decisions** below. Are we using Next.js Server Actions for form submissions, or creating REST API endpoints in `/api`? The plan currently assumes **Server Actions** as it is the standard for Next 15 App Router. 

---

## 1. Architecture & Coding Standards

To maintain code quality with an AI agent, the following rules MUST be enforced during development:

1. **State Management for Complex Forms:**
   The `create` form contains a dynamic table (Excel-style). It must be refactored to use standard React state (`useState`) with an array of objects to handle dynamic rows, OR use `react-hook-form` with `useFieldArray`. Do not leave uncontrolled `<input>` tags in the loop.
2. **Data Fetching & Mutations:**
   Use **React Server Components (RSC)** for data fetching on pages like `/engineer/material-request`. Use **Next.js Server Actions** (`app/actions/materialRequest.js`) for mutations (Create, Update, Delete) instead of raw API routes, to simplify the data flow.
3. **Component Modularity:**
   Break down large pages (like `create/page.js`) into smaller client components, e.g., `<MaterialRequestTable />`, `<MaterialRequestHeader />`, to avoid bloated files.
4. **Design Consistency:**
   Always preserve the existing Tailwind classes, especially the dark mode variants (`dark:bg-slate-800`, `dark:border-gray-700`) and the branding color (`#FFC107`).

---

## 2. Proposed Database Schema (Prisma)

The current `schema.prisma` is incomplete. Based on the `create/page.js` form, a `MaterialRequest` has multiple "Items". We need a One-to-Many relationship.

### [NEW] Schema Additions
The AI must update `prisma/schema.prisma` with the following:

```prisma
model MaterialRequest {
  id              String   @id @default(cuid()) // Change to CUID or UUID for Doc Control No
  projectId       String
  projectName     String
  sysManagerReq   String
  projManagerReq  String
  workPackage     String?
  wpo             String?
  keterangan      String?
  dateReleased    DateTime?
  status          String   @default("WAITING_SYS") // WAITING_SYS, WAITING_PM, APPROVED, REJECTED
  
  items           MaterialRequestItem[]
  
  requestedBy     String // User ID of the Engineer
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
  type                  String?
  manufacturer          String?
  qty                   Int
  unit                  String
  targetDate            DateTime?
  remarks               String?
}
```

---

## 3. Step-by-Step Implementation Guide

Provide this exact sequence to the AI agent to implement features without hallucination.

### Phase 1: Database Setup
1. Update `prisma/schema.prisma` with the new models (`MaterialRequest` and `MaterialRequestItem`).
2. Run database migration: `npx prisma migrate dev --name init_mr_schema`.
3. Generate prisma client: `npx prisma generate`.

### Phase 2: Server Actions Definition
1. Create a new directory and file: `app/actions/material-request.js`.
2. Implement `createMaterialRequest(data)` function.
   - It should validate the incoming data.
   - Use `prisma.materialRequest.create` with a nested `create` for the `items`.
   - Call `revalidatePath('/engineer/material-request')` upon success.
3. Implement `getMaterialRequests(filters)` to fetch lists for the dashboard.

### Phase 3: Refactoring the Create Form (`app/engineer/material-request/create/page.js`)
1. Change the `<input>` arrays to be controlled by state:
   ```javascript
   const [items, setItems] = useState([{ description: "", qty: 0, /* ... */ }]);
   ```
2. Add "Add Row" and "Remove Row" buttons for the Excel table.
3. Bind the `SEND REQUEST` button to trigger the `createMaterialRequest` Server Action.
4. Implement loading states (`useTransition` or `useFormStatus`) to prevent double submission.

### Phase 4: Refactoring the Dashboard (`app/engineer/material-request/page.js`)
1. Convert the page to an Async Server Component (`export default async function MaterialRequestPage()`).
2. Fetch real data from Prisma instead of using the hardcoded `<tr>` elements.
3. Map the fetched data to the table rows.
4. Dynamically calculate the "Pending Approval" summary cards based on the fetched data.

---

## Open Questions

- **File Uploads**: The UI has an `📤 Upload Document (Excel)` button. Do you want the AI to implement reading the Excel file to auto-populate the table, or upload the file to a cloud storage (like AWS S3 / Vercel Blob) as an attachment?
- **Doc Control No**: The UI says `Auto Generated`. Should this use the Database CUID, or a specific format like `MR-2026-0001`?

## Verification Plan

### Manual Verification
- **Form Interactivity:** The user can add/remove rows in the Material Request table without losing input focus.
- **Database Insertion:** Submitting the form actually reflects in the MySQL database, with correct relationships between the parent Request and its Items.
- **Dark Mode:** All new dynamic components perfectly respect the `dark:` utility classes.
