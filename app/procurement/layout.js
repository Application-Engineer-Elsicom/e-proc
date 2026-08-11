import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import AppShell from '../components/AppShell'
import { getRoleDisplayName } from '@/lib/permissions'

export const metadata = {
  title: 'Procurement',
  description: 'Pengelolaan PO, harga pemasok, dan anggaran',
}

const NAV = [
  { href: '/procurement', label: 'Dashboard', icon: 'dashboard' },
  { href: '/procurement/bom', label: 'Bill of Material', icon: 'document' },
  { href: '/procurement/po-plan', label: 'Rencana PO', icon: 'plan' },
  { href: '/procurement/po-list', label: 'Daftar PO', icon: 'receipt' },
]

export default async function ProcurementLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'PROCUREMENT') {
    redirect('/')
  }

  return (
    <AppShell
      moduleName="Procurement"
      moduleSubtitle="Pengadaan"
      navItems={NAV}
      user={{ name: session.user.name, roleLabel: getRoleDisplayName(session.user) }}
    >
      {children}
    </AppShell>
  )
}
