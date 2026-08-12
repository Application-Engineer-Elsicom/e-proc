/**
 * Dijalankan otomatis setiap kali "npm install" selesai (hook postinstall npm
 * bawaan) — termasuk saat menekan tombol "Run NPM Install" di cPanel Setup
 * Node.js App, satu-satunya aksi yang tersedia di sana tanpa Terminal.
 *
 * Sengaja tidak melakukan apa pun kecuali CPANEL_DEPLOY=1 diset (lewat
 * Environment Variables di cPanel Node App). Tanpa penjaga ini, "npm install"
 * biasa di komputer developer — atau langkah "npm install" pada buildCommand
 * Railway — ikut menjalankan build produksi penuh dan prisma migrate deploy
 * terhadap DATABASE_URL yang sedang aktif, yang mengejutkan dan berisiko.
 *
 * Saat aktif, urutannya sama persis dengan `npm run build`:
 * prisma generate → prisma migrate deploy → next build.
 *
 * PENTING — terbukti di lapangan (dua kali) bahwa TIDAK ADA cara otomatis
 * yang bisa dipercaya untuk menebak lokasi aplikasi di host ini:
 *   - process.cwd() salah: "Run NPM Install" cPanel menjalankan npm dari
 *     folder nodevenv (~/nodevenv/e-proc/22/lib), bukan dari root aplikasi.
 *   - process.env.npm_package_json JUGA salah: nilainya ikut menunjuk ke
 *     folder nodevenv itu juga — bukan sekadar cwd yang keliru, tapi npm
 *     sendiri di host ini memang tidak pernah tahu di mana root aplikasi
 *     yang benar. Folder nodevenv itu bukan leluhur dari root aplikasi,
 *     jadi menyusuri ke atas dari cwd pun tidak akan pernah sampai ke sana.
 *
 * Karena itu appRoot di sini WAJIB diisi eksplisit lewat env var
 * CPANEL_APP_ROOT (nilainya: field "Application root" yang sama persis
 * seperti yang ditampilkan di halaman Setup Node.js App) — tidak ada lagi
 * yang ditebak.
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

console.log(`[cpanel-postinstall] Root aplikasi: ${appRoot}`);
console.log("[cpanel-postinstall] CPANEL_DEPLOY=1 — menjalankan: prisma generate, migrate deploy, next build");

const steps = [
  ["npx", ["prisma", "generate"]],
  ["npx", ["prisma", "migrate", "deploy"]],
];

// Opsional dan terpisah dari CPANEL_DEPLOY: hanya membuat akun PROJECT_MANAGER
// pertama saat database masih kosong. Lihat cpanel-seed-admin.cjs untuk alasan
// kenapa ini perlu ada. Cabut SEED_FIRST_ADMIN setelah berhasil login sekali.
if (process.env.SEED_FIRST_ADMIN === "1") {
  steps.push(["node", [path.join(appRoot, "scripts", "cpanel-seed-admin.cjs")]]);
}

steps.push(["npx", ["next", "build"]]);

for (const [cmd, args] of steps) {
  console.log(`[cpanel-postinstall] $ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true, cwd: appRoot });
  if (result.status !== 0) {
    console.error(`[cpanel-postinstall] Gagal pada: ${cmd} ${args.join(" ")}`);
    process.exit(result.status || 1);
  }
}

console.log("[cpanel-postinstall] Selesai.");
