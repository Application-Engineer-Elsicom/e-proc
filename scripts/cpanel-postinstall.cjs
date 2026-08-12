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
 * PENTING — appRoot WAJIB diisi eksplisit lewat env var CPANEL_APP_ROOT
 * (isi field "Application root" apa adanya). Terbukti di lapangan, tidak ada
 * satu pun env var bawaan npm (npm_package_json, dll) yang bisa dipercaya di
 * host ini untuk menebak lokasi aplikasi — semuanya ikut menunjuk ke folder
 * nodevenv, yang bukan leluhur dari root aplikasi.
 *
 * PENTING JUGA — seluruh output tiap langkah ditulis ke tmp/cpanel-deploy.log
 * di root aplikasi, bukan cuma dicetak ke layar. Kotak "Run NPM Install" di
 * cPanel memotong baris panjang jadi "...", dan npm debug log TIDAK menyimpan
 * stdout/stderr proses anak (prisma, next) sama sekali — cuma jejak internal
 * npm sendiri. Tanpa berkas log terpisah ini, pesan error sesungguhnya dari
 * prisma/next tidak pernah benar-benar terbaca lewat cPanel.
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
log("CPANEL_DEPLOY=1 — menjalankan: prisma generate, migrate deploy, next build");
log(`Log lengkap tersimpan di: ${logPath} (buka lewat File Manager kalau ada yang gagal)`);

// Diagnostik: "prisma generate" gagal dengan RangeError WASM out-of-memory
// meski Physical Memory Usage cPanel menunjukkan RAM masih longgar. Dugaan:
// batas *virtual memory* (ulimit -v) dari CloudLinux LVE — angka yang TIDAK
// ditampilkan di widget Resource Usage cPanel sama sekali. `ulimit -a` murah
// dan aman dijalankan duluan supaya dugaan ini punya bukti, bukan tebakan.
{
  const ulimitResult = spawnSync("sh", ["-c", "ulimit -a"], { encoding: "utf8" });
  log(`--- ulimit -a (diagnostik batas resource) ---\n${ulimitResult.stdout || ulimitResult.stderr || "(tidak bisa dibaca)"}`);
}

// "npx prisma ..." dijalankan lewat WebAssembly untuk membaca schema.prisma,
// dan WASM V8 mencadangkan ruang alamat virtual besar di muka — kebentur
// ulimit -v 4GB LVE server ini (lihat log ulimit -a di atas). Solusinya:
// panggil node LANGSUNG ke berkas index.js Prisma dengan --require memuat
// cpanel-wasm-preload.cjs duluan, supaya v8.setFlagsFromString mematikan
// trik itu SEBELUM modul WASM Prisma sempat dimuat. NODE_OPTIONS tidak bisa
// dipakai untuk ini — sudah terbukti Node menolaknya lewat env var.
//
// require.resolve dengan paths:[appRoot], bukan path hardcoded — supaya
// yang dipanggil pasti salinan prisma yang ter-install di node_modules
// aplikasi ini, bukan salinan lain yang mungkin ketemu duluan lewat PATH.
let prismaEntry;
try {
  prismaEntry = require.resolve("prisma/build/index.js", { paths: [appRoot] });
} catch (err) {
  log(`GAGAL menemukan paket prisma di node_modules: ${err.message}`);
  process.exit(1);
}
const wasmPreload = path.join(appRoot, "scripts", "cpanel-wasm-preload.cjs");
const runPrisma = (...prismaArgs) => [
  "node",
  ["--require", wasmPreload, prismaEntry, ...prismaArgs],
];

const steps = [runPrisma("generate"), runPrisma("migrate", "deploy")];

// Opsional dan terpisah dari CPANEL_DEPLOY: hanya membuat akun PROJECT_MANAGER
// pertama saat database masih kosong. Lihat cpanel-seed-admin.cjs untuk alasan
// kenapa ini perlu ada. Cabut SEED_FIRST_ADMIN setelah berhasil login sekali.
if (process.env.SEED_FIRST_ADMIN === "1") {
  steps.push(["node", [path.join(appRoot, "scripts", "cpanel-seed-admin.cjs")]]);
}

steps.push(["npx", ["next", "build"]]);

for (const [cmd, args] of steps) {
  log(`$ ${cmd} ${args.join(" ")}`);
  // encoding:'utf8' (bukan stdio:'inherit') supaya stdout/stderr proses anak
  // bisa ditangkap sebagai string dan ditulis ke logPath, bukan cuma mengalir
  // langsung ke kotak output cPanel yang memotong baris panjang.
  //
  // shell:false khusus untuk "node" — argumennya sudah array token utuh
  // (--require, path preload, path entry prisma, dst) dan tidak butuh fitur
  // shell apa pun. Terbukti lewat pengujian: shell:true memecah path yang
  // mengandung spasi jadi argumen terpisah dan merusak pasangan --require.
  const result = spawnSync(cmd, args, { shell: cmd !== "node", cwd: appRoot, encoding: "utf8" });
  if (result.stdout) log(`--- stdout ---\n${result.stdout}`);
  if (result.stderr) log(`--- stderr ---\n${result.stderr}`);

  if (result.status !== 0) {
    log(`GAGAL pada: ${cmd} ${args.join(" ")} (exit ${result.status})`);
    log(`Baca detailnya di: ${logPath}`);
    process.exit(result.status || 1);
  }
}

log("Selesai.");
