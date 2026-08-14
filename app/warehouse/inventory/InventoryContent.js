"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertInventoryItem, deleteInventoryItem } from "../../actions/inventory";

const EMPTY = { id: null, itemName: "", sku: "", stockQty: "", unit: "" };

export default function InventoryContent({ items }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  const editing = form.id !== null;

  const submit = (e) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await upsertInventoryItem(form);
      if (!res.success) setError(res.error);
      else {
        setForm(EMPTY);
        router.refresh();
      }
    });
  };

  const remove = (id) => {
    if (!confirm("Hapus item stok ini?")) return;
    startTransition(async () => {
      const res = await deleteInventoryItem(id);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Form tambah/edit */}
      <form onSubmit={submit} className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-medium">{editing ? "Ubah Item Stok" : "Tambah Item Stok"}</p>
        {error && (
          <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input value={form.itemName} onChange={set("itemName")} placeholder="Nama item"
            className="rounded-md border bg-background px-3 py-2 text-sm lg:col-span-2" />
          <input value={form.sku} onChange={set("sku")} placeholder="SKU"
            className="rounded-md border bg-background px-3 py-2 text-sm" />
          <input value={form.stockQty} onChange={set("stockQty")} type="number" min="0" placeholder="Stok"
            className="rounded-md border bg-background px-3 py-2 text-sm" />
          <input value={form.unit} onChange={set("unit")} placeholder="Satuan (pcs/roll)"
            className="rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="submit" disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {isPending ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah"}
          </button>
          {editing && (
            <button type="button" onClick={() => setForm(EMPTY)}
              className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent">
              Batal
            </button>
          )}
        </div>
      </form>

      {/* Daftar stok */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Nama Item</th>
              <th className="px-4 py-2 font-medium">SKU</th>
              <th className="px-4 py-2 font-medium text-right">Stok</th>
              <th className="px-4 py-2 font-medium">Satuan</th>
              <th className="px-4 py-2 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada item stok.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{it.itemName}</td>
                  <td className="px-4 py-2 text-muted-foreground">{it.sku}</td>
                  <td className="px-4 py-2 text-right font-semibold">{it.stockQty}</td>
                  <td className="px-4 py-2">{it.unit}</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => setForm({ ...it, stockQty: String(it.stockQty) })}
                      className="mr-3 text-xs font-medium text-primary hover:underline">
                      Ubah
                    </button>
                    <button type="button" onClick={() => remove(it.id)} disabled={isPending}
                      className="text-xs font-medium text-destructive hover:underline disabled:opacity-50">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
