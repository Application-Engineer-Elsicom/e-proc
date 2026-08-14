"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerMR } from "../actions/document-control";

const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("id-ID") : "—");

export default function DocControlContent({ pending, registered }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  // Nilai form per MR (docControlNo default = yang sudah ada, dateReleased = hari ini).
  const [forms, setForms] = useState(() =>
    Object.fromEntries(pending.map((mr) => [mr.id, { docControlNo: mr.docControlNo, dateReleased: today() }])),
  );

  const set = (id, k) => (e) =>
    setForms((f) => ({ ...f, [id]: { ...f[id], [k]: e.target.value } }));

  const submit = (mr) => {
    const form = forms[mr.id];
    setError("");
    startTransition(async () => {
      const res = await registerMR(mr.id, form);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* Antrian registrasi */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Menunggu Registrasi ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Tidak ada MR yang menunggu registrasi.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((mr) => (
              <div key={mr.id} className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-semibold">{mr.projectName}</p>
                    <p className="text-xs text-muted-foreground">
                      Oleh {mr.requester?.name} · {mr.items?.length || 0} item · disetujui PM
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr,180px,auto] sm:items-end">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Doc. Control No</label>
                    <input
                      value={forms[mr.id]?.docControlNo || ""}
                      onChange={set(mr.id, "docControlNo")}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Date Released</label>
                    <input
                      type="date"
                      value={forms[mr.id]?.dateReleased || today()}
                      onChange={set(mr.id, "dateReleased")}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => submit(mr)}
                    disabled={isPending}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isPending ? "..." : "Registrasi"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Riwayat */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Sudah Diregistrasi</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Doc. Control No</th>
                <th className="px-4 py-2 font-medium">Proyek</th>
                <th className="px-4 py-2 font-medium">Requestor</th>
                <th className="px-4 py-2 font-medium">Date Released</th>
              </tr>
            </thead>
            <tbody>
              {registered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada MR yang diregistrasi.
                  </td>
                </tr>
              ) : (
                registered.map((mr) => (
                  <tr key={mr.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{mr.docControlNo}</td>
                    <td className="px-4 py-2">{mr.projectName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{mr.requester?.name}</td>
                    <td className="px-4 py-2">{fmtDate(mr.dateReleased)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
