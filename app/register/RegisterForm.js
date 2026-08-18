"use client";

import { useActionState, useState } from "react";
import { registerUser } from "@/lib/actions/auth";

const ROLES = [
  { value: "ENGINEER", label: "Engineer" },
  { value: "MARKETING", label: "Marketing" },
  { value: "PROCUREMENT", label: "Procurement" },
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "DOCUMENT_CONTROL", label: "Document Control" },
  { value: "FINANCE", label: "Finance" },
];

const ENGINEER_ROLES = [
  { value: "STAFF", label: "Staff — merinci BoM, membuat FR/MR/WR" },
  { value: "WPO", label: "WPO — persetujuan jenjang pertama" },
  { value: "SYSTEM", label: "System — persetujuan jenjang kedua" },
];

const INPUT_CLASS =
  "w-full rounded-md border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-foreground";

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerUser, null);
  const [role, setRole] = useState("ENGINEER");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Buat Akun Pengguna</h1>
          <p className="mt-1 text-sm text-muted-foreground">Elsicom Procurement Systems</p>
        </div>

        {state?.error && (
          <div className="mb-5 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="mb-5 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>Nama Lengkap</label>
            <input name="name" type="text" placeholder="Budi Santoso" className={INPUT_CLASS} required />
          </div>

          <div>
            <label className={LABEL_CLASS}>Username</label>
            <input name="username" type="text" placeholder="budi.santoso" className={INPUT_CLASS} required />
          </div>

          <div>
            <label className={LABEL_CLASS}>Password</label>
            <input name="password" type="password" placeholder="••••••••" minLength={8} className={INPUT_CLASS} required />
            <p className="mt-1 text-xs text-muted-foreground">Minimal 8 karakter.</p>
          </div>

          <div>
            <label className={LABEL_CLASS}>Peran</label>
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
              <label className={LABEL_CLASS}>Jenjang Engineer</label>
              <select name="engineerRole" className={INPUT_CLASS}>
                {ENGINEER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={LABEL_CLASS}>Jabatan (opsional)</label>
            <input name="position" type="text" placeholder="Field Engineer" className={INPUT_CLASS} />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Menyimpan…" : "Buat Akun"}
          </button>
        </form>
      </div>
    </div>
  );
}
