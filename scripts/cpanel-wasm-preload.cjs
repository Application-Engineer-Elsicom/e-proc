/**
 * Dimuat lewat `node --require` SEBELUM CLI Prisma jalan (lihat pemakaiannya
 * di cpanel-postinstall.cjs) — supaya berjalan di proses yang sama sebelum
 * Prisma memuat modul WebAssembly-nya (prisma_schema_build_bg.wasm).
 *
 * Kenapa lewat --require, bukan NODE_OPTIONS: sudah dibuktikan di lapangan
 * Node menolak flag ini lewat NODE_OPTIONS ("is not allowed in NODE_OPTIONS")
 * — itu proteksi keamanan bawaan Node untuk flag V8 yang menyentuh tata letak
 * memori/JIT, supaya env var dari luar tidak bisa mengubah perilaku proses
 * yang tidak diminta pemanggilnya. v8.setFlagsFromString() dari skrip yang
 * memang kita tulis sendiri tidak kena batasan itu.
 *
 * Kenapa flag ini perlu: `ulimit -a` di server terbukti membatasi virtual
 * memory ke 4GB (CloudLinux LVE) — bukan RAM fisik, yang longgar (8GB, nyaris
 * tidak terpakai). Mesin WASM V8 secara default mencadangkan ruang alamat
 * virtual sampai ~4GB sekaligus per WebAssembly.Instance (trik lama supaya
 * pengecekan batas memori gratis lewat page-fault hardware), dan itu sendirian
 * sudah menghabiskan seluruh jatah 4GB sebelum proses sempat melakukan apa-apa
 * lagi. --no-wasm-trap-handler memaksa V8 memakai pengecekan eksplisit per
 * akses memori alih-alih trik itu — sedikit lebih lambat, tapi tidak masalah
 * untuk prisma generate/migrate deploy yang cuma jalan sekali per deploy.
 *
 * Kalau flag ini tidak dikenali di suatu platform, V8 hanya mencetak
 * peringatan ke stderr dan proses tetap lanjut normal — sudah diverifikasi
 * tidak fatal, aman dibiarkan berjalan di semua lingkungan.
 */
require("v8").setFlagsFromString("--no-wasm-trap-handler");
