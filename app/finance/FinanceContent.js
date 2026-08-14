"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markInvoicePaid } from "../actions/finance";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("id-ID") : "—");
const fmtIDR = (n) =>
  n == null ? "—" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(n));

export default function FinanceContent({ unpaid, paid }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const pay = (inv) => {
    if (!confirm(`Tandai invoice ${inv.invoiceNo} (${fmtIDR(inv.amount)}) sebagai LUNAS?`)) return;
    setError("");
    startTransition(async () => {
      const res = await markInvoicePaid(inv.id);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Belum Lunas ({unpaid.length})</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Invoice</th>
                <th className="px-4 py-2 font-medium">PO</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium text-right">Jumlah</th>
                <th className="px-4 py-2 font-medium">Tgl Invoice</th>
                <th className="px-4 py-2 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {unpaid.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Tidak ada invoice yang belum lunas.
                  </td>
                </tr>
              ) : (
                unpaid.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{inv.invoiceNo}</td>
                    <td className="px-4 py-2">{inv.po?.poNumber}</td>
                    <td className="px-4 py-2 text-muted-foreground">{inv.po?.supplierName}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtIDR(inv.amount)}</td>
                    <td className="px-4 py-2">{fmtDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => pay(inv)}
                        disabled={isPending}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isPending ? "..." : "Tandai Lunas"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Sudah Lunas</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Invoice</th>
                <th className="px-4 py-2 font-medium">PO</th>
                <th className="px-4 py-2 font-medium text-right">Jumlah</th>
                <th className="px-4 py-2 font-medium">Dibayar</th>
              </tr>
            </thead>
            <tbody>
              {paid.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada invoice lunas.
                  </td>
                </tr>
              ) : (
                paid.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{inv.invoiceNo}</td>
                    <td className="px-4 py-2">{inv.po?.poNumber}</td>
                    <td className="px-4 py-2 text-right">{fmtIDR(inv.amount)}</td>
                    <td className="px-4 py-2 text-green-600">{fmtDate(inv.paidAt)}</td>
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
