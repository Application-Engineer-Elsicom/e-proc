# E-Proc — Perencanaan Aplikasi

> Dokumen konsolidasi. Menggantikan pembacaan 20 file `PHASE*`/`*_PLANNING` yang saling
> bertumpuk dan sebagian sudah usang. Isi: kondisi nyata hari ini (hasil baca kode, bukan
> klaim dokumen lama), gap yang masih terbuka, dan roadmap berprioritas.
>
> Terakhir disusun: 27 Jul 2026 · Basis: commit `f755f69`

---

## 1. Ringkasan Produk

Aplikasi ERP e-procurement internal untuk kontraktor engineering (Elsicom). Alurnya
mengikuti dokumen fisik yang sudah dipakai perusahaan:

**Marketing** menerbitkan BoM dari kontrak → **Engineer** merinci & menyetujui berjenjang →
**Procurement** memberi harga dan menerbitkan PO → material masuk gudang → dipakai proyek.

Di samping alur BoM ada tiga dokumen operasional harian: **FR** (Fault Report), **MR**
(Material Request), dan **WR** (Warehouse Release) — ketiganya melewati rantai persetujuan
yang sama.

---

## 2. Stack Teknis

| Lapis | Pilihan | Catatan |
|---|---|---|
| Framework | Next.js 15.5.12 (App Router) | Server Components + Server Actions, **tanpa REST API layer** |
| Bahasa | JavaScript (bukan TypeScript) | `jsconfig.json` alias `@/*` → `app/*` |
| UI | React 19, Tailwind CSS 4 | recharts (grafik), react-hook-form |
| Data | Prisma 6 + MySQL | 2 migration, schema 623 baris |
| Auth | NextAuth v4, Credentials + JWT | role & engineerRole ikut di token |
| Validasi | zod | dipakai di `app/lib/zod-schemas.js` |
| Export | xlsx | `lib/export-utils.js` |
| Lint/Format | Biome 2.2 | `npm run lint` / `npm run format` |
| Deploy | Railway (nixpacks) | `railway.toml`, migrate deploy saat start |

**Keputusan arsitektur yang sudah mengikat:** semua mutasi data lewat Server Actions di
`app/actions/*.js` (13 file, ~3.500 baris). Tidak ada endpoint API selain NextAuth. Guard
akses ditulis dua kali — di `layout.js` tiap segmen role, dan di dalam tiap server action.

---

## 3. Peran Pengguna

7 role di enum `Role`, dengan `ENGINEER` punya 3 sub-role (`EngineerRole`):

| Role | Sub-role | Tanggung jawab | Dashboard |
|---|---|---|---|
| MARKETING | — | Buat BoM dari kontrak, submit, arsip | `/marketing` ✅ |
| ENGINEER | STAFF | Rinci item BoM (langsung / pecah sub-item), buat FR/MR/WR | `/engineer` ✅ |
| ENGINEER | WPO | Approve tahap 1 (BoM, FR, MR, WR) | `/engineer` ✅ |
| ENGINEER | SYSTEM | Approve tahap 2, aktivasi BoM → Procurement | `/engineer` ✅ |
| PROJECT_MANAGER | — | Approve tahap akhir FR/MR/WR | `/pm` ✅ |
| PROCUREMENT | — | Pricing BoM, PO, supplier price, budget, pinjam antar-proyek | `/procurement` ✅ |
| WPO | — | Modul terpisah (legacy) | `/wpo` ✅ |
| FINANCE | — | Pembayaran invoice PO | ❌ **belum ada** |
| WAREHOUSE | — | Terima material, surat jalan, stok | ❌ **belum ada** |

**Aturan skip-level** (`getInitialApprovalStatus`): pembuat dokumen melompati tahap
persetujuannya sendiri. Dibuat STAFF → `WAITING_WPO`; dibuat WPO → `WAITING_SYSTEM`;
dibuat SYSTEM → `WAITING_PM`.

---

## 4. Alur Utama

### 4.1 BoM (jalur inti)

```
Marketing            Engineer STAFF        Engineer WPO       Engineer SYSTEM     Procurement
   │                       │                     │                   │                 │
 DRAFT ──submit──▶ SUBMITTED ──refine──▶ WPO_REVIEW ──approve──▶ SYSTEM_REVIEW ──▶ SYSTEM_APPROVED
   │                       │                     │                   │                 │
   │                       │              WPO_REJECTED        SYSTEM_REJECTED      ──pricing──▶
   │                       │                     └──────── balik ke STAFF ─────────┘        │
   └──────────────────────────────── ARCHIVED ◀── ACTIVE ◀────────────────────────────── PRICED
```

Dua mode perincian per item (`BomItem.hasSubItems`):
- `false` → engineer isi `refinedQty`/`refinedDesc` langsung di item tersebut
- `true` → engineer memecah jadi beberapa `BomSubItem`, procurement memberi harga per sub-item

Semua transisi tercatat di `BomHistory` (aksi, pelaku, snapshot JSON sebelum/sesudah).

### 4.2 FR / MR / WR

```
Engineer buat ──▶ WAITING_WPO ──▶ WAITING_SYSTEM ──▶ WAITING_PM ──▶ APPROVED
                       │                 │                │
                       └─────────── REJECTED ─────────────┘
```

Lanjutan status setelah `APPROVED` — `PROCUREMENT_PROCESS`, `FINANCE_PAID`,
`AVAILABLE_IN_WAREHOUSE`, `SHIPPED` — sudah ada di enum tapi **belum ada kode yang
menuliskannya**. Ini titik sambung ke modul Finance & Warehouse yang belum dibangun.

### 4.3 Procurement

`/procurement` punya 3 area: **Dashboard** (grafik budget vs realisasi), **PO Plan**
(rencana PO dari MR/WR/FR + barang pinjaman antar-proyek), **PO List** (PO aktif, invoice,
supplier price). `POHealth` dihitung saat fetch dari selisih `deliveryTime` ke hari ini —
`ON_TRACK` > 14 hari, `WARNING` 7–14, `CRITICAL` 0–7, `LATE` lewat, `RECEIVED` semua Mat In.

---

## 5. Peta Kode

```
app/
  actions/         13 server action — satu file per domain (bom, purchase-order, dst)
  lib/
    prisma.js        singleton client
    permissions.js   RBAC terpusat — checkBomPermission + helper per role
    zod-schemas.js   skema validasi input
    bom-utils.js     penomoran dokumen, kalkulasi
  api/auth/        NextAuth handler + logout
  marketing/ engineer/ pm/ wpo/ procurement/   satu segmen per role, guard di layout.js
lib/export-utils.js  export xlsx
prisma/schema.prisma 17 model
seed.cjs             data uji
```

**Konvensi penomoran dokumen:** `BOM-2026-XXXX`, `MR-2026-XXXX`, `FR-2026-XXXX`,
`WR-2026-XXXX`, `BR-2026-XXXX`; PO pakai format berbeda `001/2499/Elsicom` (bisa diedit).

---

## 6. Gap Terbuka

Diurut menurut risiko, hasil telusur kode — bukan daftar keinginan.

| # | Gap | Dampak | Bukti |
|---|---|---|---|
| G1 | **Registrasi terbuka, role dipilih sendiri** — `registerUser` tidak cek sesi, tidak validasi role, tidak cek username ganda | Siapa pun yang bisa akses URL dapat membuat akun `PROCUREMENT` | [auth.js:6](app/lib/actions/auth.js:6) |
| G2 | **Upload file ke disk kontainer** — MR menulis ke `public/uploads/` | Lampiran hilang setiap redeploy Railway (filesystem ephemeral) | [material-request.js:60](app/actions/material-request.js:60) |
| G3 | **Tidak ada master Project** — `projectId`/`projectName` string bebas di 8 model | Salah ketik = data proyek terpecah, laporan budget tidak akurat | `schema.prisma` |
| G4 | **Modul FINANCE & WAREHOUSE kosong** | 4 status di enum tidak pernah tercapai; rantai berhenti di `APPROVED` | [page.js:23](app/page.js:23) fallback "belum punya dashboard" |
| G5 | **Nol test** | Setiap perubahan rantai approval diuji manual | — |
| G6 | Model `Inventory` & `SuratJalan` tidak dipakai sama sekali | Schema menyesatkan pembaca berikutnya | grep tanpa hasil |
| G7 | Guard duplikat di tiap `layout.js`, tanpa `middleware.js` | Segmen baru mudah lupa diberi guard | — |
| G8 | `console.log` mencatat percobaan login | Bocoran username di log produksi | [route.js:11](app/api/auth/[...nextauth]/route.js:11) |
| G9 | 20 file dokumen perencanaan saling tumpang tindih & sebagian usang | Onboarding lambat, sumber kebenaran tidak jelas | root repo |

---

## 7. Roadmap

Empat fase. Tiap fase berdiri sendiri dan bisa dirilis.

### Fase A — Pengerasan (prioritas tertinggi, ~2 hari)

Tidak menambah fitur, menutup lubang. Kerjakan ini sebelum aplikasi dipakai lebih luas.

1. **G1** — `registerUser`: tolak jika bukan sesi admin, whitelist role via zod, tangani
   username duplikat. Alternatif lebih malas dan lebih aman: hapus `/register`, buat user
   lewat seed/skrip saja.
2. **G8** — buang `console.log` kredensial di `authorize()`.
3. **G2** — pindahkan lampiran ke object storage (Railway volume atau S3-compatible),
   simpan URL saja.
4. **G7** — satu `middleware.js` untuk pemetaan prefix→role; layout cukup ambil sesi.

### Fase B — Master Project (~3 hari)

Menutup G3, prasyarat pelaporan yang benar.

1. Model `Project { id, code, name, contractNo, status, pm }`.
2. Migrasi: kumpulkan `projectId` unik yang ada → isi tabel → ubah kolom jadi relasi.
3. Ganti input teks proyek di semua form jadi dropdown.
4. Cabut `ProjectBudget.projectId` string → relasi.

*Risiko:* migrasi data eksisting. Jalankan skrip pemetaan di staging dulu, simpan kolom
lama sebagai `legacyProjectId` satu rilis.

### Fase C — Menutup rantai: Warehouse & Finance (~5 hari)

Menutup G4 dan menghidupkan `Inventory`/`SuratJalan` (G6).

- `/warehouse` — terima PO item (`matIn`, `receivedQty`), terbitkan Surat Jalan,
  saldo stok dari `Inventory`. Status MR/WR maju ke `AVAILABLE_IN_WAREHOUSE` → `SHIPPED`.
- `/finance` — daftar `POInvoice` belum bayar, tandai lunas, status PO → `FINANCE_PAID`.
- Kalau salah satunya belum dibutuhkan bisnis sekarang: bangun Warehouse saja, dan
  **hapus** enum/model Finance daripada meninggalkannya kosong.

### Fase D — Kualitas & pemeliharaan (berjalan paralel)

- **G5** — mulai dari satu berkas uji untuk `getInitialApprovalStatus` dan transisi status
  BoM: itu logika bercabang yang paling mahal kalau salah. Jangan bikin framework test,
  cukup `node --test`.
- **G9** — arsipkan `PHASE*.md` ke `docs/archive/`, jadikan dokumen ini + `GETTING_STARTED.md`
  satu-satunya rujukan aktif.
- Notifikasi (email/in-app) saat dokumen menunggu approval — baru setelah ada yang mengeluh
  soal dokumen mengendap, jangan sebelum itu.

---

## 8. Yang Sengaja Tidak Dikerjakan

Dicatat supaya tidak jadi pertanyaan berulang.

- **Migrasi ke TypeScript** — nilainya nyata tapi biayanya seluruh codebase; zod di
  perbatasan input sudah menangkap sebagian besar kelas bug yang sama.
- **REST/GraphQL API** — belum ada konsumen selain UI sendiri. Tambah saat ada aplikasi
  mobile atau integrasi luar.
- **Lapisan service/repository di atas Prisma** — server action sudah jadi batas yang jelas;
  abstraksi tambahan hanya menambah lompatan file.
- **Real-time / websocket** — dokumen approval bergerak dalam hitungan jam, bukan detik.

---

## 9. Perintah Kerja

```bash
npm run dev              # dev server
npm run build            # prisma generate + migrate deploy + next build
npm run seed             # isi data uji (seed.cjs)
npm run lint             # biome check
npx prisma migrate dev   # buat migration baru
npx prisma studio        # inspeksi data
```

Variabel wajib: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (lihat `.env.example`).
