import Link from 'next/link'
import { getGoodsReceiptPOs, getWRForWarehouseApproval } from '../actions/warehouse'
import { getApprovedWRForShipment } from '../actions/warehouse-release'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Warehouse — Dashboard' }

export default async function WarehouseDashboard() {
  const [poResult, wrResult, shipResult] = await Promise.all([
    getGoodsReceiptPOs(),
    getWRForWarehouseApproval(),
    getApprovedWRForShipment(),
  ])
  const pos = poResult.success ? poResult.data : []
  const wrs = wrResult.success ? wrResult.data : []
  const ships = shipResult.success ? shipResult.data : []

  const cards = [
    {
      href: '/warehouse/goods-receipt',
      label: 'PO Menunggu Goods Receipt',
      count: pos.length,
      hint: 'PO yang sudah dikirim supplier, tunggu konfirmasi barang tiba',
    },
    {
      href: '/warehouse/warehouse-release',
      label: 'WR Menunggu Approval Warehouse',
      count: wrs.length,
      hint: 'Cek ketersediaan fisik lalu setujui / tolak',
    },
    {
      href: '/warehouse/shipment',
      label: 'WR Siap Dikirim',
      count: ships.length,
      hint: 'Sudah disetujui kedua sisi, tinggal kirim barang',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard Warehouse</h1>
        <p className="text-sm text-muted-foreground">Ringkasan pekerjaan gudang yang menunggu tindakan.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border bg-card p-6 transition-colors hover:bg-accent"
          >
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
              <span className="text-3xl font-bold">{c.count}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{c.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
