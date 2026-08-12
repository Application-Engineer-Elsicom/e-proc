/**
 * NEXT_PUBLIC_BASE_PATH mengatur di subfolder mana aplikasi ini berjalan.
 * Kosong di dev lokal dan di Railway (aplikasi ada di root domain). Diisi
 * "/e-proc" saat deploy ke cPanel di elsicom.co.id/e-proc, supaya seluruh
 * routing, asset _next/*, dan endpoint NextAuth ikut ke-prefix otomatis.
 *
 * Nilai yang sama dipakai di app/login/page.js untuk window.location.href,
 * karena navigasi lewat window.location tidak melalui router Next.js dan
 * tidak ikut di-prefix basePath secara otomatis seperti <Link>/redirect().
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  // Server cPanel tidak punya "sharp" (dan tidak dipasang sengaja — host ini
  // sudah berkali-kali bermasalah dengan dependency native/WASM), jadi
  // /_next/image bawaan Next 500 tanpa ini. Gambar di app ini cuma logo dan
  // ilustrasi statis, tidak butuh resizing server-side.
  images: { unoptimized: true },
  // Default Next untuk halaman terprerender adalah "s-maxage=31536000" (cache
  // 1 tahun) — di host LiteSpeed/Passenger ini itu bikin halaman lama nyangkut
  // di cache dan versi baru tidak pernah muncul setelah deploy. Paksa semua
  // rute HTML tidak di-cache oleh cache bersama; KECUALI aset ber-hash di
  // _next/static & _next/image yang memang aman (dan seharusnya) di-cache lama
  // karena namanya berubah tiap build.
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image).*)",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
