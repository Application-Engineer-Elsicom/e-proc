"use client";

import { useActionState, useState } from "react";
import { registerUser } from "@/lib/actions/auth";

const ROLES = [
  { value: "ENGINEER", label: "Engineer" },
  { value: "MARKETING", label: "Marketing" },
  { value: "PROCUREMENT", label: "Procurement" },
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "WPO", label: "WPO" },
  { value: "FINANCE", label: "Finance" },
  { value: "WAREHOUSE", label: "Warehouse" },
];

const ENGINEER_ROLES = [
  { value: "STAFF", label: "Staff — merinci BoM, membuat FR/MR/WR" },
  { value: "WPO", label: "WPO — persetujuan jenjang pertama" },
  { value: "SYSTEM", label: "System — persetujuan jenjang kedua" },
];

const INPUT_CLASS =
  "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-600 outline-none";

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerUser, null);
  const [role, setRole] = useState("ENGINEER");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Buat Akun Pengguna</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Elsicom Procurement Systems</p>
        </div>

        {state?.error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="mb-5 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
            <input name="name" type="text" placeholder="Budi Santoso" className={INPUT_CLASS} required />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input name="username" type="text" placeholder="budi.santoso" className={INPUT_CLASS} required />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input name="password" type="password" placeholder="••••••••" minLength={8} className={INPUT_CLASS} required />
            <p className="text-xs text-gray-400 mt-1">Minimal 8 karakter.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Peran</label>
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={INPUT_CLASS}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Engineer wajib punya jenjang — menentukan tahap persetujuan mana yang dilewati */}
          {role === "ENGINEER" && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Jenjang Engineer</label>
              <select name="engineerRole" className={INPUT_CLASS}>
                {ENGINEER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Jabatan (opsional)</label>
            <input name="position" type="text" placeholder="Field Engineer" className={INPUT_CLASS} />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#2d2d2d] hover:bg-black disabled:bg-gray-400 text-white py-4 rounded-lg font-bold text-lg shadow-lg transition-all mt-4 transform active:scale-95"
          >
            {isPending ? "Menyimpan…" : "Buat Akun"}
          </button>
        </form>
      </div>
    </div>
  );
}
