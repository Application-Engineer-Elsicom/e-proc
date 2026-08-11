import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import AppShell from '../components/AppShell'
import { getRoleDisplayName } from '@/lib/permissions'

export const metadata = {
  title: 'Engineer',
  description: 'Perincian dan persetujuan dokumen teknis',
}

const NAV = [
  { href: '/engineer', label: 'Dashboard', icon: 'dashboard' },
  { href: '/engineer/bom', label: 'Bill of Material', icon: 'document' },
  { href: '/engineer/material-request', label: 'Material Request', icon: 'package' },
  { href: '/engineer/fault-report', label: 'Fault Report', icon: 'fault' },
  { href: '/engineer/warehouse-release', label: 'Warehouse Release', icon: 'truck' },
]

// Sub-role menentukan tugas utama, jadi ditampilkan sebagai subjudul modul.
const SUBTITLE_BY_ENGINEER_ROLE = {
  STAFF: 'Perincian',
  WPO: 'Persetujuan Mutu',
  SYSTEM: 'Persetujuan Sistem',
}

export default async function EngineerLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'ENGINEER') {
    redirect('/')
  }

  return (
    <AppShell
      moduleName="Engineer"
      moduleSubtitle={SUBTITLE_BY_ENGINEER_ROLE[session.user.engineerRole] || 'Engineer'}
      navItems={NAV}
      user={{ name: session.user.name, roleLabel: getRoleDisplayName(session.user) }}
    >
      {children}
    </AppShell>
  )
}
