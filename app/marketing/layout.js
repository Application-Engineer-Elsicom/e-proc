import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import AppShell from '../components/AppShell'
import { getRoleDisplayName } from '@/lib/permissions'

export const metadata = {
  title: 'Marketing',
  description: 'Buat dan kelola Bill of Material',
}

const NAV = [
  { href: '/marketing', label: 'Dashboard', icon: 'dashboard' },
  { href: '/marketing/bom', label: 'Bill of Material', icon: 'document' },
]

export default async function MarketingLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'MARKETING') {
    redirect('/')
  }

  return (
    <AppShell
      moduleName="Marketing"
      moduleSubtitle="Bill of Material"
      navItems={NAV}
      user={{ name: session.user.name, roleLabel: getRoleDisplayName(session.user) }}
    >
      {children}
    </AppShell>
  )
}
