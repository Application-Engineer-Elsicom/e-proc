"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function WPOLayout({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const menuItems = [
    { name: 'Dashboard', href: '/wpo', icon: '🏠' },
    { name: 'Request Approval', href: '/wpo/approval', icon: '✅' },
    { name: 'Procurement Link', href: '/wpo/procurement', icon: '🔗' },
  ];

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* SIDEBAR */}
      <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        ${isDarkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'} 
        border-r transition-all duration-300 flex flex-col fixed h-full z-50
      `}>
        <div className="p-4 flex items-center justify-between border-b border-inherit">
          {isSidebarOpen && <span className="font-bold text-lg text-red-600">E-PROC WPO</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link key={item.name} href={item.href}>
              <div className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                pathname === item.href ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-gray-500/10'
              }`}>
                <span className="text-xl">{item.icon}</span>
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-inherit space-y-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="w-full flex items-center gap-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 transition-all"
          >
            <span>{isDarkMode ? '☀️' : '🌙'}</span>
            {isSidebarOpen && <span className="font-bold">{isDarkMode ? 'Light' : 'Dark'} Mode</span>}
          </button>
          <Link href="/login" className="w-full flex items-center gap-4 p-3 rounded-lg text-red-500 hover:bg-red-50">
            <span>🚪</span>
            {isSidebarOpen && <span className="font-bold">Logout</span>}
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">WPO Workspace</h2>
          <div className="flex items-center gap-3 font-bold">WPO Administrator</div>
        </header>

        <main className="p-8 flex-1">
          {children}
        </main>
        <footer className="py-4 text-center text-xs text-gray-400">
            © {currentYear} Elsicom Engineering - WPO Module.
          </footer>
      </div>
    </div>
  );
}
