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
 * lagi.
 *
 * --no-wasm-trap-handler (percobaan pertama) TERBUKTI tidak dikenal di build
 * V8 Node 20 CloudLinux ini ("unrecognized flag"). --wasm-enforce-bounds-checks
 * di bawah adalah percobaan kedua, dengan deskripsi resmi V8 yang jauh lebih
 * cocok: "enforce explicit bounds check even if the trap handler is
 * available" — memaksa V8 memakai pengecekan eksplisit per akses memori,
 * mem-bypass trap-handler yang butuh cadangan ruang alamat besar itu.
 *
 * Beberapa nama dicoba sekaligus dengan aman: setFlagsFromString untuk flag
 * yang tidak dikenal di suatu platform HANYA mencetak peringatan ke stderr,
 * tidak pernah menghentikan proses — jadi tidak ada resiko mencoba lebih dari
 * satu di sini, yang penting cocok akan langsung terpakai.
 */
const v8 = require("v8");
v8.setFlagsFromString("--wasm-enforce-bounds-checks");
v8.setFlagsFromString("--no-wasm-trap-handler");
