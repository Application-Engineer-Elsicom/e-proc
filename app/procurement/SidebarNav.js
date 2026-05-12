'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SidebarNav({ session }) {
  const pathname = usePathname()

  const navItems = [
    { href: '/procurement', label: 'Dashboard', icon: '📊' },
    { href: '/procurement/po-plan', label: 'PO Plan', icon: '📋' },
    { href: '/procurement/po-list', label: 'PO List', icon: '📄' },
    { divider: true },
    { href: '#', label: 'Finances', icon: '💰', disabled: true },
    { href: '#', label: 'Back Office', icon: '🏢', disabled: true },
  ]

  const isActive = (href) => {
    if (href === '/procurement') {
      return pathname === '/procurement'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-slate-900 dark:bg-slate-950 border-r border-slate-800 sticky top-0 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <Link href="/procurement" className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/50 transition-all">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-sm">ELSICOM</p>
            <p className="text-slate-400 text-[10px]">Procurement</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item, idx) => {
          if (item.divider) {
            return (
              <div key={idx} className="my-4 border-t border-slate-800" />
            )
          }

          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                ${item.disabled
                  ? 'text-slate-600 cursor-not-allowed opacity-50'
                  : active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.disabled && <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">TBD</span>}
            </Link>
          )
        })}
      </nav>

      {/* User Info Footer */}
      <div className="border-t border-slate-800 p-4">
        <div className="bg-slate-800 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{session.user.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{session.user.name}</p>
              <p className="text-slate-400 text-[10px]">Procurement</p>
            </div>
          </div>
          <a
            href="/api/auth/signout?callbackUrl=/login"
            className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg transition text-center block"
          >
            Logout
          </a>
        </div>
      </div>
    </aside>
  )
}
