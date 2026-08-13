/**
 * Loader gambar kustom untuk next/image.
 *
 * Dipakai karena dua hal sekaligus di deploy cPanel:
 *  1. Server tidak punya "sharp", jadi optimasi gambar bawaan Next 500.
 *     Loader kustom mem-bypass optimizer sepenuhnya (mengembalikan URL apa
 *     adanya) — tidak butuh sharp sama sekali.
 *  2. Aplikasi berjalan di subpath /e-proc (basePath). next/image dengan
 *     mode unoptimized TIDAK menambahkan basePath ke src, sehingga gambar
 *     public seperti "/logo-elsicom.png" diminta ke root domain dan 404.
 *     Loader ini menambahkan prefix basePath secara eksplisit.
 *
 * NEXT_PUBLIC_BASE_PATH di-inline saat build (kosong di lokal/Railway,
 * "/e-proc" di cPanel), jadi nilainya benar per lingkungan.
 */
export default function cpanelImageLoader({ src }) {
  // URL absolut (http/https) atau data URI dibiarkan apa adanya.
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) {
    return src;
  }
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const path = src.startsWith("/") ? src : `/${src}`;
  return `${basePath}${path}`;
}
