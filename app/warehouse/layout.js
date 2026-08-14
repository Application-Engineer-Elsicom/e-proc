import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import AppShell from '../components/AppShell'
import { getRoleDisplayName } from '@/lib/permissions'

export const metadata = {
  title: 'Warehouse',
  description: 'Goods Receipt & approval Warehouse Release',
}

const NAV = [
  { href: '/warehouse', label: 'Dashboard', icon: 'dashboard' },
  { href: '/warehouse/goods-receipt', label: 'Goods Receipt', icon: 'goodsReceipt' },
  { href: '/warehouse/warehouse-release', label: 'Approval WR', icon: 'approval' },
  { href: '/warehouse/shipment', label: 'Pengiriman', icon: 'truck' },
  { href: '/warehouse/inventory', label: 'Inventory', icon: 'package' },
]

export default async function WarehouseLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'WAREHOUSE') {
    redirect('/')
  }

  return (
    <AppShell
      moduleName="Warehouse"
      moduleSubtitle="Gudang"
      navItems={NAV}
      user={{ name: session.user.name, roleLabel: getRoleDisplayName(session.user) }}
    >
      {children}
    </AppShell>
  )
}
