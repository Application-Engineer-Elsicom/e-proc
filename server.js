/**
 * Entry point khusus untuk Phusion Passenger (fitur "Setup Node.js App" di cPanel).
 *
 * Passenger tidak menjalankan perintah CLI seperti `next start` — ia meng-
 * require() satu berkas JS dan mengharapkan berkas itu membuka HTTP server
 * sendiri pada port yang diberikan lewat process.env.PORT. Berkas ini HANYA
 * dipakai oleh Passenger (didaftarkan sebagai "Application startup file" di
 * cPanel); `npm run dev` dan `npm start` di package.json tidak berubah dan
 * tetap dipakai untuk pengembangan lokal serta deploy Railway.
 *
 * CommonJS (require, bukan import) karena package.json tidak mengaktifkan
 * "type": "module", dan Passenger menjalankan berkas ini apa adanya.
 */
const { createServer } = require("http");
const path = require("node:path");
const fs = require("node:fs");
const next = require("next");

// Berkas ini HANYA dipakai lewat Passenger untuk deploy cPanel (lihat komentar
// di atas) — tidak pernah untuk dev lokal (itu pakai `next dev` langsung).
// Jadi "dev" di sini SELALU false, tidak digantungkan ke NODE_ENV, karena
// terbukti NODE_ENV tidak ikut ter-set lewat SetEnv .htaccess cPanel — kalau
// digantungkan ke situ, Next diam-diam jalan mode dev (butuh compiler
// on-the-fly yang kena masalah WASM yang sama, dan tidak cocok dengan hasil
// build production yang sudah disiapkan di deploy-artifacts/next-build/).
const port = process.env.PORT || 3000;
const errorLogPath = path.join(__dirname, "tmp", "server-error.log");

function logFatal(label, err) {
  const stamped = `[${new Date().toISOString()}] ${label}: ${err?.stack || err}\n`;
  process.stderr.write(stamped);
  try {
    fs.appendFileSync(errorLogPath, stamped);
  } catch {
    // Jangan sampai kegagalan menulis log menutupi error aslinya.
  }
}

process.on("uncaughtException", (err) => logFatal("uncaughtException", err));
process.on("unhandledRejection", (err) => logFatal("unhandledRejection", err));

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`E-Proc siap di port ${port}`);
    });
  })
  .catch((err) => {
    logFatal("app.prepare() gagal", err);
    process.exit(1);
  });
