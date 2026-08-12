/**
 * Dimuat lewat `node --require` SEBELUM CLI Prisma jalan (lihat pemakaiannya
 * di cpanel-postinstall.cjs) — supaya berjalan di proses yang sama sebelum
 * Prisma memuat modul WebAssembly-nya (prisma_schema_build_bg.wasm).
 *
 * Kenapa lewat --require, bukan NODE_OPTIONS: sudah dibuktikan di lapangan
 * Node menolak flag ini lewat NODE_OPTIONS ("is not allowed in NODE_OPTIONS").
 * v8.setFlagsFromString() dari skrip yang kita tulis sendiri tidak kena
 * batasan itu.
 *
 * Riwayat percobaan (lihat tmp/cpanel-deploy.log di server untuk buktinya):
 * 1. --no-wasm-trap-handler — TIDAK ADA di build V8 host ini sama sekali
 *    (dump lengkap --v8-options tidak memuat satu pun flag "trap-handler").
 * 2. --wasm-enforce-bounds-checks — diterima tapi tidak berpengaruh, karena
 *    tanpa mekanisme trap-handler di build ini, bounds-check eksplisit sudah
 *    jadi satu-satunya mode (--wasm-bounds-checks sudah default aktif).
 * 3. --wasm-max-mem-pages rendah — diterima tapi OOM tetap terjadi. Artinya
 *    ukuran *linear memory* WASM bukan biang keroknya.
 *
 * Titik curiga baru: --wasm-max-committed-code-mb, batas *ruang kode*
 * ter-kompilasi WASM, defaultnya 4095 MB — nyaris persis sama dengan
 * ulimit -v host ini (4194304 KB = 4096 MB, lihat log ulimit -a). Diturunkan
 * jauh di bawah itu; schema-parser Prisma cuma perlu beberapa MB kode.
 */
const v8 = require("v8");
v8.setFlagsFromString("--wasm-max-committed-code-mb=64");
v8.setFlagsFromString("--wasm-max-mem-pages=2048");
