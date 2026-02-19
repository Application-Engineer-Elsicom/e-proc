import Link from 'next/link';
import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export default async function EngineerDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ENGINEER") {
    redirect("/login")
  }
  const modules = [
    { title: 'Material Request', desc: 'Ajukan permintaan material proyek.', href: '/engineer/material-request', icon: '📋', color: 'text-yellow-500' },
    { title: 'Warehouse Release', desc: 'Monitor pengeluaran barang gudang.', href: '/engineer/warehouse-release', icon: '📦', color: 'text-blue-500' },
    { title: 'Fault Report', desc: 'Laporkan kerusakan aset real-time.', href: '/engineer/fault-report', icon: '⚠️', color: 'text-red-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10">
        {/* Gunakan dark:text-white agar teks berubah saat mode gelap */}
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2 tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Pilih modul di bawah untuk mengelola permintaan teknis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <Link key={mod.title} href={mod.href}>
            {/* KUNCI: 
               1. Gunakan bg-white untuk mode terang
               2. Gunakan dark:bg-[#1a1a1a] untuk mode gelap
               3. Gunakan dark:border-gray-800 agar border tidak terlalu terang 
            */}
            <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all cursor-pointer h-full">
              <div className="text-4xl mb-4">{mod.icon}</div>
              <h3 className={`text-xl font-bold mb-2 ${mod.color}`}>{mod.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {mod.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}