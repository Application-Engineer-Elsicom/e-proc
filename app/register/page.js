"use client";
import { registerUser } from "@/lib/actions/auth";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
        
        {/* Header dengan teks hitam/putih yang jelas */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Create Account
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Elsicom Procurement Systems
          </p>
        </div>

        <form action={registerUser} className="space-y-5">
          {/* Group Input: Tambahkan text-gray-900 agar ketikan terbaca jelas */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input 
              name="name" 
              type="text"
              placeholder="John Doe" 
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-600 outline-none" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input 
              name="username" 
              type="text"
              placeholder="username_engineer"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-600 outline-none" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input 
              name="password" 
              type="password" 
              placeholder="••••••••"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-600 outline-none" 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select name="role" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none">
                <option value="ENGINEER">Engineer</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Jabatan</label>
              <select name="position" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white outline-none">
                <option value="Field Engineer">Field Engineer</option>
                <option value="System Manager">System Manager</option>
                <option value="Project Manager">Project Manager</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full bg-[#2d2d2d] hover:bg-black text-white py-4 rounded-lg font-bold text-lg shadow-lg transition-all mt-4 transform active:scale-95">
            Daftar Sekarang
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          Sudah punya akun? <a href="/login" className="text-red-600 font-bold hover:underline">Sign In</a>
        </p>
      </div>
    </div>
  );
}