"use client";
import Link from 'next/link';

export default function MaterialRequestPage() {
  // Update header agar sesuai dengan form input baru
  const headers = [
    "Project ID", "Project Name", "WP/WPO", "Sys Manager", "Proj Manager", 
    "Total Items", "Date Requested", "Status"
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black dark:text-white">Material Request</h1>
          <p className="text-gray-500">Monitoring sistem pengadaan material</p>
        </div>
        <Link href="/engineer/material-request/create" className="bg-[#2d2d2d] text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-all shadow-md">
          + New Request
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="flex gap-4">
        <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-3xl flex justify-between items-center w-72 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
            Pending Approval<br/>
            <span className="text-xs font-normal">System Engineer</span>
          </div>
          <span className="text-4xl font-black text-yellow-600">2</span>
        </div>
        <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-3xl flex justify-between items-center w-72 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
            Pending Approval<br/>
            <span className="text-xs font-normal">Project Manager</span>
          </div>
          <span className="text-4xl font-black text-blue-600">1</span>
        </div>
      </div>

      {/* Tabel Dashboard (Excel Style) */}
      <div className="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg">
        <table className="w-full border-collapse bg-white dark:bg-slate-900 text-xs">
          <thead>
            <tr className="bg-[#FFC107] text-black uppercase font-bold">
              <th className="border border-gray-400 p-3">No</th>
              {headers.map(h => <th key={h} className="border border-gray-400 p-3 text-left">{h}</th>)}
              <th className="border border-gray-400 p-3">Action</th>
            </tr>
          </thead>
          <tbody className="dark:text-gray-300">
            {/* Contoh data baris */}
            <tr className="hover:bg-yellow-50 dark:hover:bg-slate-800 transition-colors">
              <td className="border border-gray-300 dark:border-gray-700 p-3 text-center">1</td>
              <td className="border border-gray-300 dark:border-gray-700 p-3 font-bold">PRJ-001</td>
              <td className="border border-gray-300 dark:border-gray-700 p-3">CCTV Installation</td>
              <td className="border border-gray-300 dark:border-gray-700 p-3 text-blue-600">WP-X / WPO-09</td>
              <td className="border border-gray-300 dark:border-gray-700 p-3">Andi</td>
              <td className="border border-gray-300 dark:border-gray-700 p-3">Citra</td>
              <td className="border border-gray-300 dark:border-gray-700 p-3 text-center">12</td>
              <td className="border border-gray-300 dark:border-gray-700 p-3 italic">2026-02-19</td>
              <td className="border border-gray-300 dark:border-gray-700 p-3">
                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] font-bold">WAITING SYS</span>
              </td>
              <td className="border border-gray-300 dark:border-gray-700 p-3 text-center">
                <button className="text-blue-500 hover:underline">View Detail</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}