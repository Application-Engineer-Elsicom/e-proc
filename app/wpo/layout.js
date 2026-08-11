import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import AppShell from '../components/AppShell'
import { getRoleDisplayName } from '@/lib/permissions'

export const metadata = {
  title: 'WPO',
  description: 'Persetujuan Material Request',
}

const NAV = [{ href: '/wpo', label: 'Persetujuan', icon: 'approval' }]

// Catatan: role WPO berdiri sendiri ini tumpang tindih dengan ENGINEER sub-role
// WPO. Dokumen Perancangan Terpadu (Bab 4) menyarankan menonaktifkannya agar
// tidak ada dua sumber kebenaran approval — belum dieksekusi, menunggu keputusan.
export default async function WPOLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'WPO') {
    redirect('/')
  }

  return (
    <AppShell
      moduleName="WPO"
      moduleSubtitle="Persetujuan"
      navItems={NAV}
      user={{ name: session.user.name, roleLabel: getRoleDisplayName(session.user) }}
    >
      {children}
    </AppShell>
  )
}
