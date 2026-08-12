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
 */
const { spawnSync } = require("node:child_process");

if (process.env.CPANEL_DEPLOY !== "1") {
  console.log(
    "[cpanel-postinstall] CPANEL_DEPLOY tidak diset — dilewati (normal untuk npm install lokal/Railway).",
  );
  process.exit(0);
}

console.log("[cpanel-postinstall] CPANEL_DEPLOY=1 — menjalankan: prisma generate, migrate deploy, next build");

const steps = [
  ["npx", ["prisma", "generate"]],
  ["npx", ["prisma", "migrate", "deploy"]],
];

// Opsional dan terpisah dari CPANEL_DEPLOY: hanya membuat akun PROJECT_MANAGER
// pertama saat database masih kosong. Lihat cpanel-seed-admin.cjs untuk alasan
// kenapa ini perlu ada. Cabut SEED_FIRST_ADMIN setelah berhasil login sekali.
if (process.env.SEED_FIRST_ADMIN === "1") {
  steps.push(["node", ["scripts/cpanel-seed-admin.cjs"]]);
}

steps.push(["npx", ["next", "build"]]);

for (const [cmd, args] of steps) {
  console.log(`[cpanel-postinstall] $ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`[cpanel-postinstall] Gagal pada: ${cmd} ${args.join(" ")}`);
    process.exit(result.status || 1);
  }
}

console.log("[cpanel-postinstall] Selesai.");
