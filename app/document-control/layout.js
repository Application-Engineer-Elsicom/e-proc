import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import AppShell from '../components/AppShell'
import { getRoleDisplayName } from '@/lib/permissions'

export const metadata = {
  title: 'Document Control',
  description: 'Registrasi nomor dokumen MR',
}

const NAV = [
  { href: '/document-control', label: 'Registrasi MR', icon: 'document' },
]

export default async function DocumentControlLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'DOCUMENT_CONTROL') redirect('/')

  return (
    <AppShell
      moduleName="Document Control"
      moduleSubtitle="Registrasi Dokumen"
      navItems={NAV}
      user={{ name: session.user.name, roleLabel: getRoleDisplayName(session.user) }}
    >
      {children}
    </AppShell>
  )
}
