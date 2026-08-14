import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import AppShell from '../components/AppShell'
import { getRoleDisplayName } from '@/lib/permissions'

export const metadata = {
  title: 'Finance',
  description: 'Pembayaran invoice PO',
}

const NAV = [
  { href: '/finance', label: 'Invoice PO', icon: 'receipt' },
]

export default async function FinanceLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'FINANCE') redirect('/')

  return (
    <AppShell
      moduleName="Finance"
      moduleSubtitle="Pembayaran"
      navItems={NAV}
      user={{ name: session.user.name, roleLabel: getRoleDisplayName(session.user) }}
    >
      {children}
    </AppShell>
  )
}
