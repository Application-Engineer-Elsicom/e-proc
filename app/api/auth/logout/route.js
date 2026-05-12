import { signOut } from 'next-auth/react'
import { redirect } from 'next/navigation'

export async function GET() {
  // This endpoint handles logout
  redirect('/api/auth/signout?callbackUrl=/login')
}
