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
 * PENTING — jangan percaya process.cwd() di sini. Terbukti di lapangan,
 * "Run NPM Install" cPanel bisa memanggil npm dengan working directory yang
 * BUKAN root aplikasi (contoh nyata: cwd tertinggal di folder nodevenv,
 * bukan folder git clone), sehingga argumen path relatif ke `node`/`prisma`
 * gagal "Cannot find module". package.json sengaja memanggil berkas ini lewat
 * npm_package_json (env var yang SELALU diisi npm dengan lokasi package.json
 * yang sedang diproses, terlepas dari cwd) — dan appRoot di bawah dipakai
 * ulang sebagai `cwd` eksplisit di setiap spawnSync, supaya prisma/next juga
 * tidak ikut tersesat.
 */
const path = require("node:path");
const { spawnSync } = require("node:child_process");

if (process.env.CPANEL_DEPLOY !== "1") {
  console.log(
    "[cpanel-postinstall] CPANEL_DEPLOY tidak diset — dilewati (normal untuk npm install lokal/Railway).",
  );
  process.exit(0);
}

const appRoot = path.dirname(process.env.npm_package_json || path.join(__dirname, "..", "package.json"));
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
