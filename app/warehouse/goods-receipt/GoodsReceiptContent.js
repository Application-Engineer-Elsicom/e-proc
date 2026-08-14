"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markItemReceived } from "../../actions/purchase-order";

const today = () => new Date().toISOString().split("T")[0];

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString("id-ID") : "—";
}

export default function GoodsReceiptContent({ pos }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  // Tanggal Mat In per item (default hari ini), disimpan lokal sebelum submit.
  const [dates, setDates] = useState({});

  const receive = (itemId) => {
    const date = dates[itemId] || today();
    setError("");
    startTransition(async () => {
      const result = await markItemReceived(itemId, date);
      if (!result.success) setError(result.error);
      else router.refresh();
    });
  };

  if (!pos || pos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Tidak ada PO yang menunggu penerimaan barang.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {pos.map((po) => (
        <div key={po.id} className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-3">
            <div>
              <p className="font-semibold">{po.poNumber}</p>
              <p className="text-xs text-muted-foreground">
                {po.supplierName} · {po.projectCode}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              {po.status === "PARTIAL_RECEIVED" ? "Sebagian Diterima" : "Menunggu Penerimaan"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Deskripsi</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Mat In</th>
                  <th className="px-5 py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {po.items?.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-5 py-2">{item.description}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {item.qty} {item.unit}
                    </td>
                    <td className="px-3 py-2">
                      {item.matIn ? (
                        <span className="font-medium text-green-600">✓ {fmtDate(item.matIn)}</span>
                      ) : (
                        <input
                          type="date"
                          value={dates[item.id] || today()}
                          onChange={(e) => setDates((d) => ({ ...d, [item.id]: e.target.value }))}
                          className="rounded-md border bg-background px-2 py-1 text-xs"
                        />
                      )}
                    </td>
                    <td className="px-5 py-2 text-right">
                      {item.matIn ? (
                        <span className="text-xs text-muted-foreground">Diterima</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => receive(item.id)}
                          disabled={isPending}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isPending ? "..." : "Terima"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
