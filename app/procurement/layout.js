import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import SidebarNav from './SidebarNav'

export const metadata = {
  title: 'Procurement Dashboard',
  description: 'PO Management, Supplier Pricing, Budget Tracking',
}

export default async function ProcurementLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'PROCUREMENT') {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* Dark Sidebar */}
      <SidebarNav session={session} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6">
            {children}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-8 py-4 text-center text-xs text-gray-500 dark:text-slate-400">
          E-Procurement System • Procurement Module
        </footer>
      </main>
    </div>
  )
}
