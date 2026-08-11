'use client'

import { signOut } from 'next-auth/react'
import { useState } from 'react'

// Selalu menempel, apa pun className dari pemanggil.
// cursor-pointer wajib di sini: preflight Tailwind v4 memberi `cursor: default`
// pada <button>, jadi tanpa ini tombol terasa mati padahal kelas hover-nya ada.
const BASE_CLASS =
  'cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

const DEFAULT_CLASS =
  'px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-white'

/**
 * Satu-satunya cara keluar dari aplikasi.
 * Jangan diganti dengan <Link href="/login"> — itu hanya berpindah halaman dan
 * sesi tetap hidup. Jangan pula pakai href ke /api/auth/signout: itu membuka
 * halaman bawaan NextAuth yang tampilannya lepas dari aplikasi.
 */
export default function LogoutButton({ className, children }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    await signOut({ redirect: true, callbackUrl: '/login' })
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={`${BASE_CLASS} ${className || DEFAULT_CLASS}`}
    >
      {isLoading ? 'Keluar…' : children || 'Logout'}
    </button>
  )
}
