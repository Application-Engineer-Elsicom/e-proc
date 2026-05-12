import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Engineer - BoM Refinement & Approval',
  description: 'Refine and approve Bill of Materials',
}

export default async function EngineerLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'ENGINEER') {
    redirect('/marketing')
  }

  const engineerRoleLabel = {
    STAFF: 'Refinement',
    WPO: 'Quality Approval',
    SYSTEM: 'System Approval',
  }[session.user.engineerRole] || 'Engineer'

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Engineer
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {engineerRoleLabel}
                </p>
              </div>

              <nav className="hidden md:flex gap-6">
                <a
                  href="/engineer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition"
                >
                  Dashboard
                </a>
                <a
                  href="/engineer/bom"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition"
                >
                  BoM
                </a>
                <a
                  href="/engineer/material-request"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition"
                >
                  Material Request
                </a>
                <a
                  href="/engineer/fault-report"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition"
                >
                  Fault Report
                </a>
                <a
                  href="/engineer/warehouse-release"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition"
                >
                  Warehouse Release
                </a>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {session.user.engineerRole || 'Engineer'}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {session.user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <a
                href="/api/auth/signout?callbackUrl=/login"
                className="ml-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                Logout
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            E-Procurement System • Engineer Module • BoM Refinement & Approval
          </p>
        </div>
      </footer>
    </div>
  )
}
