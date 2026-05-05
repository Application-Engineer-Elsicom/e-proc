# Phase 1: Database Setup - Step 1 Complete ✅

**Status**: Schema Updated & Ready for Migration  
**Date**: 2026-05-04  
**Next**: Configure Database & Run Migration

---

## ✅ Completed

- [x] Updated `prisma/schema.prisma` dengan:
  - [x] Enum baru: `EngineerRole`, `BomStatus`, `BomItemStatus`
  - [x] Model baru: `BillOfMaterial`, `BomItem`, `BomHistory`
  - [x] Updated `User` model dengan `engineerRole` field & BoM relations
  - [x] Enum `Role` updated dengan `MARKETING`
- [x] npm install - dependencies installed
- [x] Created `.env.local` template

---

## 📋 NEXT STEPS (PENTING!)

### Step 1: Update `.env.local` dengan MySQL Credentials Anda

File `.env.local` sudah dibuat di root project. Sekarang Anda perlu update dengan credentials MySQL yang sebenarnya:

```bash
# Buka file: .env.local

# Cari baris ini:
DATABASE_URL="mysql://root:password@localhost:3306/e_proc"

# Update dengan credentials Anda:
# Format: mysql://username:password@host:port/database_name

# Contoh 1 (localhost):
DATABASE_URL="mysql://root:yourpassword@localhost:3306/e_proc"

# Contoh 2 (XAMPP/Laragon):
DATABASE_URL="mysql://root:@localhost:3306/e_proc"

# Contoh 3 (External host):
DATABASE_URL="mysql://user:password@192.168.1.100:3306/e_proc"
```

### Step 2: Pastikan MySQL Service Berjalan

```bash
# Windows (XAMPP/Laragon):
- Buka XAMPP Control Panel atau Laragon
- Start MySQL service

# Linux:
sudo systemctl start mysql

# macOS:
brew services start mysql
```

### Step 3: Verifikasi Database Connection

```bash
# Test connection dengan Prisma
npx prisma db push --skip-generate

# Output yang diharap:
# ✔ Your database is now in sync with your Prisma schema
```

### Step 4: Run Migration

Setelah DATABASE_URL ter-update, jalankan:

```bash
cd /path/to/e-proc

# Run migration (ini akan create tables di database)
npx prisma migrate dev --name init_bom_models

# Output yang diharap:
# Your migration is ready. Review the changes and confirm to continue.
# ✓ Created migration folder and migration_XXX.sql
# ✓ Applied migration 20260504XXXXXX_init_bom_models
# ✓ Generated Prisma Client
```

### Step 5: Generate Prisma Client

```bash
npx prisma generate

# Output yang diharap:
# ✔ Generated Prisma Client v6.19.2 to ./node_modules/@prisma/client
```

### Step 6: Verify Tables Created

```bash
# Masuk ke MySQL client:
mysql -u root -p e_proc

# List semua tables:
SHOW TABLES;

# Expected output (diantaranya):
# - BillOfMaterial
# - BomItem
# - BomHistory
# + semua tables lama (User, MaterialRequest, FaultReport, dll)

# Exit MySQL:
exit
```

---

## 📊 Schema Summary

Berikut models baru yang ditambahkan:

### Model: BillOfMaterial
```
- bomNo (UNIQUE) - Format: BOM-2026-XXXX
- projectId, projectName, projectCode
- bomStatus (enum) - DRAFT → SUBMITTED → WPO_REVIEW → ... → ACTIVE
- createdBy, submittedBy, wpoApprovedBy, systemApprovedBy (FK → User)
- timestamps: createdAt, updatedAt, submittedAt
```

### Model: BomItem
```
- bomId (FK → BillOfMaterial)
- Marketing baseline: marketingDesc, marketingQty, marketingUnit
- Engineer refinement: refinedDesc, refinedQty, refinedUnit, notes
- Pricing: unitPrice, totalPrice, currency, supplier, leadTime
- itemStatus (enum) - PENDING → REFINED → APPROVED → PRICED
```

### Model: BomHistory
```
- bomId (FK → BillOfMaterial)
- action (string) - CREATED, SUBMITTED, WPO_APPROVED, PRICED, etc
- performedBy (FK → User)
- details, previousData, newData (JSON snapshots)
- timestamp
```

### User Model Updates
```
Added field:
- engineerRole (EngineerRole?) - Only if role = "ENGINEER"

Added relations:
- bomsCreated, bomsSubmitted, bomsWpoApproved, bomsSystemApproved
- bomHistories
```

---

## 🐛 Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:3306"
**Masalah**: MySQL service tidak berjalan  
**Solusi**:
```bash
# XAMPP/Laragon
- Buka Control Panel dan start MySQL

# Linux
sudo systemctl start mysql

# macOS
brew services start mysql
```

### Error: "Access denied for user 'root'@'localhost'"
**Masalah**: Password salah di DATABASE_URL  
**Solusi**:
```bash
# Update .env.local dengan password yang benar
# Atau jika tidak ada password:
DATABASE_URL="mysql://root:@localhost:3306/e_proc"
```

### Error: "database 'e_proc' does not exist"
**Masalah**: Database belum dibuat  
**Solusi**:
```bash
# Pilihan 1: Buat database manual
mysql -u root -p
> CREATE DATABASE e_proc;
> exit

# Pilihan 2: Biarkan Prisma buat otomatis
npx prisma migrate deploy
```

### Error: "Cannot find module 'prisma'"
**Masalah**: Dependencies tidak terinstall  
**Solusi**:
```bash
npm install
```

---

## ✅ Verification Checklist

Sebelum lanjut ke step berikutnya, pastikan:

- [ ] `.env.local` sudah dibuat & DATABASE_URL sudah ter-update
- [ ] MySQL service running
- [ ] Database connection test berhasil (`npx prisma db push --skip-generate`)
- [ ] Migration berhasil: `npx prisma migrate dev --name init_bom_models`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Semua 3 tables baru ada di database (verify dengan MySQL client)
- [ ] Schema.prisma valid (no errors saat dibuka)

---

## 📝 Next Phase

Setelah database setup selesai & semua checks passed, lanjut ke:

**Phase 1 - Step 2**: 
- Create Permission Helper (`app/lib/permissions.js`)
- Create BoM Utilities (`app/lib/bom-utils.js`)
- Create Zod Schemas (`app/lib/zod-schemas.js`)

---

**Questions?**  
Refer back to: `BoM_FEATURE_PLAN.md` Section 1 (Database Schema)  
Or check: `BoM_IMPLEMENTATION_CHECKLIST.md` Phase 1

**Last Updated**: 2026-05-04  
**Status**: 🟡 Waiting for User Configuration
