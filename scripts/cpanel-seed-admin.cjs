/**
 * Membuat SATU akun PROJECT_MANAGER pertama di database yang masih kosong.
 *
 * Kenapa ini perlu ada: app/register/page.js mensyaratkan sesi PROJECT_MANAGER
 * yang sudah login sebelum menampilkan form buat-akun (lihat app/lib/actions/auth.js).
 * Itu aturan yang benar untuk operasional sehari-hari, tapi berarti ayam-dan-telur
 * persis sesudah migrate deploy pertama kali: database baru, nol user, tidak ada
 * yang bisa login untuk membuka /register — dan tidak ada Terminal di cPanel untuk
 * menjalankan seed.cjs secara manual. Skrip inilah satu-satunya jalan keluar buntu itu.
 *
 * Dipanggil dari scripts/cpanel-postinstall.cjs, HANYA jika SEED_FIRST_ADMIN=1
 * diset secara eksplisit (terpisah dari CPANEL_DEPLOY) — supaya pembuatan akun
 * produksi tidak pernah terjadi diam-diam. Idempotent (upsert by username),
 * jadi aman kalau env var ini lupa dicabut dan postinstall jalan lagi.
 */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const MIN_PASSWORD_LENGTH = 8; // Samakan dengan app/lib/actions/auth.js

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Project Manager";

  if (!username || !password) {
    console.error(
      "[cpanel-seed-admin] SEED_ADMIN_USERNAME dan SEED_ADMIN_PASSWORD wajib diisi. Dilewati.",
    );
    process.exit(1);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`[cpanel-seed-admin] Password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { username },
      update: {}, // Sudah ada -> jangan timpa password yang mungkin sudah diganti user.
      create: { username, name, password: hashed, role: "PROJECT_MANAGER" },
    });
    console.log(
      `[cpanel-seed-admin] Akun "${user.username}" (${user.role}) siap. ` +
        "Segera login dan ganti password lewat halaman aplikasi.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[cpanel-seed-admin] Gagal:", err.message);
  process.exit(1);
});
