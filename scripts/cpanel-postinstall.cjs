/**
 * Dijalankan otomatis setiap kali "npm install" selesai (hook postinstall npm
 * bawaan) — termasuk saat menekan tombol "Run NPM Install" di cPanel Setup
 * Node.js App, satu-satunya aksi yang tersedia di sana tanpa Terminal.
 *
 * Sengaja tidak melakukan apa pun kecuali CPANEL_DEPLOY=1 diset (lewat
 * Environment Variables di cPanel Node App). Tanpa penjaga ini, "npm install"
 * biasa di komputer developer — atau langkah "npm install" pada buildCommand
 * Railway — ikut menjalankan build produksi penuh terhadap DATABASE_URL yang
 * sedang aktif, yang mengejutkan dan berisiko.
 *
 * PENTING — appRoot WAJIB diisi eksplisit lewat env var CPANEL_APP_ROOT
 * (isi field "Application root" apa adanya). Terbukti di lapangan, tidak ada
 * satu pun env var bawaan npm yang bisa dipercaya di host ini untuk menebak
 * lokasi aplikasi.
 *
 * CLI Prisma (prisma generate / migrate deploy) TIDAK PERNAH dijalankan di
 * server ini — terbukti selalu crash "WebAssembly.Instance(): Out of memory"
 * karena CloudLinux LVE membatasi ulimit -v akun ini ke 4GB, dan beberapa
 * flag V8 yang dicoba (lihat riwayat di git log file ini) tidak menyelesaikan
 * akar masalahnya. Sebagai gantinya:
 *  - "prisma generate" dijalankan di komputer developer (tidak kena batas
 *    itu), hasilnya di-commit ke prisma/generated-client/ (lihat schema.prisma
 *    untuk binaryTargets rhel-openssl yang dipakai), lalu di sini TINGGAL
 *    DISALIN ke node_modules/.prisma/client — operasi file biasa, tanpa WASM.
 *  - "prisma migrate deploy" dijalankan dari komputer developer langsung ke
 *    database production (MySQL Remote Access sudah diaktifkan untuk akun
 *    ini), jadi tidak perlu dijalankan di sini sama sekali.
 */
const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

if (process.env.CPANEL_DEPLOY !== "1") {
  console.log(
    "[cpanel-postinstall] CPANEL_DEPLOY tidak diset — dilewati (normal untuk npm install lokal/Railway).",
  );
  process.exit(0);
}

const appRoot = process.env.CPANEL_APP_ROOT;

if (!appRoot) {
  console.error(
    "[cpanel-postinstall] CPANEL_APP_ROOT belum diisi. Tambahkan Environment Variable " +
      'CPANEL_APP_ROOT berisi path "Application root" persis seperti yang tertulis di ' +
      "halaman Setup Node.js App (contoh: /home/elsicomc/e-proc), lalu Run NPM Install lagi.",
  );
  process.exit(1);
}

if (!fs.existsSync(path.join(appRoot, "package.json"))) {
  console.error(
    `[cpanel-postinstall] Tidak ada package.json di "${appRoot}". CPANEL_APP_ROOT sepertinya salah — ` +
      'salin ulang persis dari field "Application root" di halaman Setup Node.js App.',
  );
  process.exit(1);
}

// tmp/ sudah ada sejak app dibuat (dipakai Passenger untuk tmp/restart.txt),
// jadi aman ditulisi dan sudah pasti punya izin tulis untuk user yang sama.
const logPath = path.join(appRoot, "tmp", "cpanel-deploy.log");

function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}\n`;
  process.stdout.write(stamped);
  try {
    fs.appendFileSync(logPath, stamped);
  } catch {
    // Jangan sampai kegagalan menulis log menghentikan proses deploy itu sendiri.
  }
}

try {
  fs.writeFileSync(logPath, `=== cpanel-postinstall mulai: ${new Date().toISOString()} ===\n`);
} catch (err) {
  console.error(`[cpanel-postinstall] Tidak bisa menulis ${logPath}: ${err.message}`);
}

log(`Root aplikasi: ${appRoot}`);
log("CPANEL_DEPLOY=1 — menyalin Prisma Client hasil generate lokal, lalu next build");
log(`Log lengkap tersimpan di: ${logPath} (buka lewat File Manager kalau ada yang gagal)`);

const generatedClientSrc = path.join(appRoot, "prisma", "generated-client");
const prismaClientDest = path.join(appRoot, "node_modules", ".prisma", "client");

if (!fs.existsSync(generatedClientSrc)) {
  log(
    `GAGAL: ${generatedClientSrc} tidak ada. Prisma Client harus di-generate dari komputer ` +
      "developer (npx prisma generate) dan hasilnya di-commit ke prisma/generated-client/ " +
      "sebelum push — lihat scripts/cpanel-postinstall.cjs untuk penjelasannya.",
  );
  process.exit(1);
}

fs.rmSync(prismaClientDest, { recursive: true, force: true });
fs.cpSync(generatedClientSrc, prismaClientDest, { recursive: true });
log(`Prisma Client disalin: ${generatedClientSrc} -> ${prismaClientDest}`);

// Opsional dan terpisah dari CPANEL_DEPLOY: hanya membuat akun PROJECT_MANAGER
// pertama saat database masih kosong. Lihat cpanel-seed-admin.cjs untuk alasan
// kenapa ini perlu ada. Cabut SEED_FIRST_ADMIN setelah berhasil login sekali.
const steps = [];
if (process.env.SEED_FIRST_ADMIN === "1") {
  steps.push(["node", [path.join(appRoot, "scripts", "cpanel-seed-admin.cjs")]]);
}
steps.push(["npx", ["next", "build"]]);

for (const [cmd, args] of steps) {
  log(`$ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { shell: true, cwd: appRoot, encoding: "utf8" });
  if (result.stdout) log(`--- stdout ---\n${result.stdout}`);
  if (result.stderr) log(`--- stderr ---\n${result.stderr}`);

  if (result.status !== 0) {
    log(`GAGAL pada: ${cmd} ${args.join(" ")} (exit ${result.status})`);
    log(`Baca detailnya di: ${logPath}`);
    process.exit(result.status || 1);
  }
}

log("Selesai.");
