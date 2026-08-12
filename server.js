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
const next = require("next");

const port = process.env.PORT || 3000;
const app = next({ dev: process.env.NODE_ENV !== "production" });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`E-Proc siap di port ${port}`);
  });
});
