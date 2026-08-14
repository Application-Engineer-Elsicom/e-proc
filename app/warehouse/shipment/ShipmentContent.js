"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { shipWarehouseRelease } from "../../actions/warehouse-release";

export default function ShipmentContent({ releases }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const ship = (wrId) => {
    if (!confirm("Tandai Warehouse Release ini sudah dikirim dari gudang?")) return;
    setError("");
    startTransition(async () => {
      const res = await shipWarehouseRelease(wrId);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  };

  if (!releases || releases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Tidak ada Warehouse Release yang siap dikirim.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {releases.map((wr) => (
          <div key={wr.id} className="flex flex-col justify-between rounded-xl border bg-card p-5">
            <div>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{wr.docNo}</p>
                  <p className="text-sm text-muted-foreground">{wr.projectName || wr.projectId}</p>
                  <p className="text-xs text-muted-foreground">Oleh {wr.requester?.name}</p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                  Disetujui
                </span>
              </div>
              <p className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">
                Items ({wr.items?.length || 0})
              </p>
              <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                {wr.items?.map((item, i) => (
                  <div key={i} className="flex justify-between rounded-md bg-muted/50 px-2 py-1 text-[11px]">
                    <span className="line-clamp-1">{item.description}</span>
                    <span className="ml-3 shrink-0 font-semibold">
                      {item.qty} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => ship(wr.id)}
              disabled={isPending}
              className="mt-4 rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Memproses..." : "Kirim Barang"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
