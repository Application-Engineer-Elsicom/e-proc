"use client";
import Link from 'next/link';

export default function WarehouseReleasePage() {
  // Header khusus untuk Warehouse Release
  const headers = [
    "WR Number", "Project ID", "Requester", "Release Date", 
    "Item Code", "Description", "Qty Released", "Receiver", "Status"
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Warehouse Release Dashboard</h1>
          <p className="text-gray-500 text-sm">Monitoring pengeluaran barang dari gudang</p>
        </div>
        <div className="flex gap-3">
          {/* Tombol Upload Excel */}
          <label className="bg-green-600 text-white px-4 py-2 rounded-md cursor-pointer flex items-center gap-2 hover:bg-green-700 transition-all text-sm font-medium">
            📤 Import Excel
            <input type="file" className="hidden" accept=".xlsx, .xls" />
          </label>
          <Link href="/engineer/warehouse-release/create" className="bg-[#2d2d2d] text-white px-6 py-2 rounded-md hover:bg-black transition-all text-sm font-medium">
            + Create WR
          </Link>
        </div>
      </div>

      {/* Summary Cards gaya Elsicom */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-gray-100 dark:bg-slate-800 p-5 rounded-2xl flex justify-between items-center w-full md:w-72 shadow-sm border border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 font-bold leading-tight text-sm">Total Items<br/>Released Today</span>
          <span className="text-4xl font-black text-blue-600">12</span>
        </div>
        <div className="bg-gray-100 dark:bg-slate-800 p-5 rounded-2xl flex justify-between items-center w-full md:w-72 shadow-sm border border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 font-bold leading-tight text-sm">Pending<br/>Pick-up</span>
          <span className="text-4xl font-black text-orange-500">5</span>
        </div>
      </div>

      {/* Tabel Excel Style */}
      <div className="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm">
        <table className="w-full border-collapse bg-white dark:bg-slate-800 text-xs">
          <thead>
            <tr className="bg-[#FFC107] text-black uppercase font-bold">
              <th className="border border-gray-400 p-3 w-10 text-center">No</th>
              {headers.map(h => (
                <th key={h} className="border border-gray-400 p-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, i) => (
              <tr key={i} className="hover:bg-yellow-50 dark:hover:bg-slate-700 transition-colors">
                <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-gray-400">{i + 1}</td>
                {headers.map(h => (
                  <td key={h} className="border border-gray-300 dark:border-gray-600 p-2 h-10"></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}