"use server";

import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

/**
 * Notifikasi in-app minimal (Tahap 2). Dipanggil dari action lain saat terjadi
 * kejadian penting (PO release, Goods Receipt, keputusan approval WR, WR dikirim).
 *
 * notify() sengaja "best effort": kegagalan menulis notifikasi TIDAK boleh
 * menggagalkan aksi utamanya (mis. approve WR tetap berhasil walau notif gagal).
 */
export async function notify(userId, message, link = null) {
  if (!userId) return;
  try {
    await prisma.notification.create({ data: { userId, message, link } });
  } catch (error) {
    console.error("Gagal membuat notifikasi:", error.message);
  }
}

/** Kirim satu notifikasi yang sama ke banyak user sekaligus (best effort). */
export async function notifyMany(userIds, message, link = null) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  if (unique.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: unique.map((userId) => ({ userId, message, link })),
    });
  } catch (error) {
    console.error("Gagal membuat notifikasi massal:", error.message);
  }
}

/** Notifikasi user yang sedang login: daftar terbaru + jumlah belum dibaca. */
export async function getMyNotifications() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: true, data: [], unread: 0 };

    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);
    return { success: true, data: items, unread };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { success: false, error: error.message, data: [], unread: 0 };
  }
}

/** Tandai notifikasi sudah dibaca (semua milik user, atau sebagian by id). */
export async function markNotificationsRead(ids = null) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
        ...(Array.isArray(ids) && ids.length ? { id: { in: ids } } : {}),
      },
      data: { isRead: true },
    });
    return { success: true };
  } catch (error) {
    console.error("Error marking notifications read:", error);
    return { success: false, error: error.message };
  }
}
