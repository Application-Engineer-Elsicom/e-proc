import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import AppShell from '../components/AppShell'
import { getRoleDisplayName } from '@/lib/permissions'

export const metadata = {
  title: 'Project Manager',
  description: 'Persetujuan akhir MR, Fault Report, dan Warehouse Release',
}

// Menu "Project Status" dan "All Requests" pada layout lama tidak pernah punya
// halaman tujuan — dibuang daripada menyisakan tautan buntu.
const NAV = [
  { href: '/pm', label: 'Persetujuan', icon: 'approval' },
]

export default async function PMLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'PROJECT_MANAGER') {
    redirect('/')
  }

  return (
    <AppShell
      moduleName="Project Manager"
      moduleSubtitle="Persetujuan Akhir"
      navItems={NAV}
      user={{ name: session.user.name, roleLabel: getRoleDisplayName(session.user) }}
    >
      {children}
    </AppShell>
  )
}
