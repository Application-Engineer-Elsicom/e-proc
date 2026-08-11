'use server'
import { prisma } from "../prisma";
import bcrypt from "bcryptjs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/api/auth/[...nextauth]/route"

// Peran yang boleh membuat akun pengguna baru.
// Sementara PROJECT_MANAGER, sampai Keputusan #1 di Dokumen Perencanaan
// (siapa yang berwenang membuat akun) ditetapkan. Ganti daftar ini bila
// keputusannya lain.
const CAN_CREATE_USERS = ["PROJECT_MANAGER"];

// Hanya peran yang memang ada di enum Role. Tanpa ini, nilai apa pun dari
// form akan masuk ke database.
const ALLOWED_ROLES = [
  "ENGINEER", "PROCUREMENT", "MARKETING",
  "WPO", "PROJECT_MANAGER", "FINANCE", "WAREHOUSE",
];
const ALLOWED_ENGINEER_ROLES = ["STAFF", "WPO", "SYSTEM"];

const MIN_PASSWORD_LENGTH = 8;

/**
 * Buat akun pengguna baru.
 *
 * Dahulu fungsi ini tidak memeriksa apa pun: tanpa sesi, tanpa pembatasan
 * peran, tanpa cek username ganda. Siapa pun yang membuka /register bisa
 * membuat akun PROCUREMENT untuk dirinya sendiri.
 */
export async function registerUser(_prevState, formData) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return { success: false, error: "Anda harus masuk terlebih dahulu." };
  }

  if (!CAN_CREATE_USERS.includes(session.user.role)) {
    return { success: false, error: "Peran Anda tidak berwenang membuat akun pengguna." };
  }

  const name = formData.get("name")?.trim();
  const username = formData.get("username")?.trim();
  const password = formData.get("password") || "";
  const role = formData.get("role");
  const engineerRole = formData.get("engineerRole") || null;
  const position = formData.get("position")?.trim() || null;

  if (!name || !username) {
    return { success: false, error: "Nama dan username wajib diisi." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.` };
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return { success: false, error: "Peran tidak dikenal." };
  }

  if (role === "ENGINEER" && !ALLOWED_ENGINEER_ROLES.includes(engineerRole)) {
    return { success: false, error: "Engineer wajib punya jenjang: STAFF, WPO, atau SYSTEM." };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { success: false, error: `Username "${username}" sudah dipakai.` };
  }

  await prisma.user.create({
    data: {
      name,
      username,
      password: await bcrypt.hash(password, 10),
      role,
      engineerRole: role === "ENGINEER" ? engineerRole : null,
      position,
    },
  });

  return { success: true, message: `Akun "${username}" berhasil dibuat.` };
}
