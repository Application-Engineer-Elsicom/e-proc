import { getInventory } from '../../actions/inventory'
import InventoryContent from './InventoryContent'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Inventory — Warehouse' }

export default async function InventoryPage() {
  const result = await getInventory()
  const items = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventory / Stok Gudang</h1>
        <p className="text-sm text-muted-foreground">
          Kelola stok barang di gudang. Stok ini ditampilkan sebagai informasi saat
          Procurement membuat PO, agar item yang sudah tersedia tidak perlu dibeli lagi.
        </p>
      </div>

      <InventoryContent items={items} />
    </div>
  )
}
