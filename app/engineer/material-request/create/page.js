"use client";
import { useState } from 'react';
import Image from 'next/image';

export default function CreateMR() {
  // Simulasi data user dari database berdasarkan role
  const sysManagers = ["Andi (System Mgr)", "Budi (System Mgr)"];
  const projectManagers = ["Citra (PM)", "Dedi (PM)"];
  const projectList = ["PRJ-001", "PRJ-002", "PRJ-003"];

  return (
    <div className="max-w-7xl mx-auto bg-white dark:bg-slate-800 p-10 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-5xl font-black text-[#FFC107] italic">Create</h1>
          <p className="text-2xl font-bold text-gray-500">Material Request</p>
        </div>
        <div className="relative w-40 h-12">
           <Image src="/logo-elsicom.png" alt="Logo" fill className="object-contain" />
        </div>
      </div>

      {/* Form Section Utama */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {/* Baris 1 */}
        <div>
          <label className="block text-sm font-bold mb-2 dark:text-gray-300">Project ID</label>
          <select className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 dark:bg-slate-700 dark:text-white">
            <option>Select Project ID</option>
            {projectList.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-2 dark:text-gray-300">Project Name</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="Input Project Name" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2 dark:text-gray-300">Assign Sys (Manager)</label>
          <select className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 dark:bg-slate-700 dark:text-white">
            <option>Select System Manager</option>
            {sysManagers.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-2 dark:text-gray-300">Assign PM (Manager)</label>
          <select className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 dark:bg-slate-700 dark:text-white">
            <option>Select Project Manager</option>
            {projectManagers.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        {/* Baris 2 */}
        <div>
          <label className="block text-sm font-bold mb-2 dark:text-gray-300">WP (Work Package)</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 dark:bg-slate-700 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2 dark:text-gray-300">WPO</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 dark:bg-slate-700 dark:text-white" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold mb-2 dark:text-gray-300">Keterangan</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded-xl bg-gray-50 dark:bg-slate-700 dark:text-white" placeholder="Catatan tambahan..." />
        </div>
      </div>

      {/* Upload Section */}
      <div className="flex justify-end mb-4">
        <label className="bg-[#2d2d2d] text-white px-4 py-2 rounded-md cursor-pointer flex items-center gap-2 hover:bg-black transition-all shadow-md">
          📤 Upload Document (Excel)
          <input type="file" className="hidden" accept=".xlsx, .xls" />
        </label>
      </div>

      {/* Tabel Input Detail (Excel Style) */}
      <div className="overflow-x-auto border border-gray-300 dark:border-gray-600 mb-6 rounded-lg">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[#FFC107] text-black">
            <tr className="uppercase">
              <th className="border border-gray-400 p-2">No</th>
              <th className="border border-gray-400 p-2 w-1/4">Description & Specification</th>
              <th className="border border-gray-400 p-2">Elsicom Part Number</th>
              <th className="border border-gray-400 p-2">Manufacturer Part No</th>
              <th className="border border-gray-400 p-2">Type</th>
              <th className="border border-gray-400 p-2">Manufacturer</th>
              <th className="border border-gray-400 p-2 w-16">Qty</th>
              <th className="border border-gray-400 p-2 w-16">Unit</th>
              <th className="border border-gray-400 p-2">Target Date</th>
              <th className="border border-gray-400 p-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="bg-white dark:bg-slate-900">
                <td className="border border-gray-300 dark:border-gray-700 p-1 text-center dark:text-gray-400">{i + 1}</td>
                <td className="border border-gray-300 dark:border-gray-700 p-1"><input className="w-full p-1 bg-transparent focus:bg-yellow-50 dark:focus:bg-slate-800 outline-none dark:text-white" /></td>
                <td className="border border-gray-300 dark:border-gray-700 p-1"><input className="w-full p-1 bg-transparent focus:bg-yellow-50 dark:focus:bg-slate-800 outline-none dark:text-white" /></td>
                <td className="border border-gray-300 dark:border-gray-700 p-1"><input className="w-full p-1 bg-transparent focus:bg-yellow-50 dark:focus:bg-slate-800 outline-none dark:text-white" /></td>
                <td className="border border-gray-300 dark:border-gray-700 p-1"><input className="w-full p-1 bg-transparent focus:bg-yellow-50 dark:focus:bg-slate-800 outline-none dark:text-white" /></td>
                <td className="border border-gray-300 dark:border-gray-700 p-1"><input className="w-full p-1 bg-transparent focus:bg-yellow-50 dark:focus:bg-slate-800 outline-none dark:text-white" /></td>
                <td className="border border-gray-300 dark:border-gray-700 p-1"><input type="number" className="w-full p-1 bg-transparent focus:bg-yellow-50 dark:focus:bg-slate-800 outline-none dark:text-white" /></td>
                <td className="border border-gray-300 dark:border-gray-700 p-1"><input className="w-full p-1 bg-transparent focus:bg-yellow-50 dark:focus:bg-slate-800 outline-none dark:text-white" /></td>
                <td className="border border-gray-300 dark:border-gray-700 p-1"><input type="date" className="w-full p-1 bg-transparent focus:bg-yellow-50 dark:focus:bg-slate-800 outline-none dark:text-white" /></td>
                <td className="border border-gray-300 dark:border-gray-700 p-1"><input className="w-full p-1 bg-transparent focus:bg-yellow-50 dark:focus:bg-slate-800 outline-none dark:text-white" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8 border-t pt-6">
        <div>
          <label className="block text-sm font-bold mb-2 dark:text-gray-300">Doc Control No</label>
          <input type="text" className="w-full p-2 border-b border-gray-300 bg-transparent outline-none dark:text-white focus:border-[#FFC107]" placeholder="Auto Generated" readOnly />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2 dark:text-gray-300">Date Released</label>
          <input type="date" className="w-full p-2 border-b border-gray-300 bg-transparent outline-none dark:text-white focus:border-[#FFC107]" />
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-[#2d2d2d] text-white px-12 py-3 rounded-md font-bold hover:bg-black shadow-lg transform active:scale-95 transition-all">
          SEND REQUEST
        </button>
      </div>
    </div>
  );
}