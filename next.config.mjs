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
};

export default nextConfig;
