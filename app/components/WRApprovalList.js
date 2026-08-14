"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveWRByWarehouse,
  rejectWRByWarehouse,
  approveWRByProcurement,
  rejectWRByProcurement,
} from "../actions/warehouse-release";
import { getWrStatusLabel } from "@/lib/permissions";

/**
 * Daftar + tombol approve/reject WR untuk satu sisi (Warehouse ATAU Procurement).
 * Dipakai bersama oleh /warehouse/warehouse-release dan
 * /procurement/warehouse-release karena keduanya hampir identik — hanya beda
 * aksi yang dipanggil dan sisi lawan yang ditampilkan.
 *
 * side: "WAREHOUSE" | "PROCUREMENT"
 */
export default function WRApprovalList({ releases, side }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const isWarehouse = side === "WAREHOUSE";
  const approveFn = isWarehouse ? approveWRByWarehouse : approveWRByProcurement;
  const rejectFn = isWarehouse ? rejectWRByWarehouse : rejectWRByProcurement;
  const sideLabel = isWarehouse ? "Warehouse (cek fisik)" : "Procurement (cek pengadaan)";

  const run = (fn, wrId, reason) => {
    setError("");
    startTransition(async () => {
      const result = await fn(wrId, reason);
      if (!result.success) setError(result.error);
      else router.refresh();
    });
  };

  const handleApprove = (wrId) => {
    if (confirm(`Setujui Warehouse Release ini dari sisi ${sideLabel}?`)) {
      run(approveFn, wrId);
    }
  };

  const handleReject = (wrId) => {
    const reason = prompt("Alasan penolakan:");
    if (reason !== null) run(rejectFn, wrId, reason);
  };

  if (!releases || releases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Tidak ada Warehouse Release yang menunggu approval {sideLabel}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {releases.map((wr) => {
          // Sisi lawan: sudah approve atau belum?
          const otherApprover = isWarehouse ? wr.procurementApprover : wr.warehouseApprover;
          const otherLabel = isWarehouse ? "Procurement" : "Warehouse";

          return (
            <div key={wr.id} className="flex flex-col justify-between rounded-xl border bg-card p-5">
              <div>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{wr.docNo}</p>
                    <p className="text-sm text-muted-foreground">{wr.projectName || wr.projectId}</p>
                    <p className="text-xs text-muted-foreground">Oleh {wr.requester?.name}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                    {getWrStatusLabel(wr.status)}
                  </span>
                </div>

                <dl className="mb-3 space-y-1 text-xs">
                  <div className="flex justify-between border-b py-1">
                    <dt className="text-muted-foreground">Delivery Target</dt>
                    <dd className="font-medium">{wr.deliveryTarget || "—"}</dd>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <dt className="text-muted-foreground">Approval {otherLabel}</dt>
                    <dd className="font-medium">
                      {otherApprover ? `✓ ${otherApprover.name}` : "Belum"}
                    </dd>
                  </div>
                </dl>

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

              <div className="mt-4 flex gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => handleReject(wr.id)}
                  disabled={isPending}
                  className="flex-1 rounded-md border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  {isPending ? "..." : "Tolak"}
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(wr.id)}
                  disabled={isPending}
                  className="flex-[2] rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "Memproses..." : "Setujui"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
