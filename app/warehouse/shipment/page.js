import { getApprovedWRForShipment } from '../../actions/warehouse-release'
import ShipmentContent from './ShipmentContent'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Pengiriman — Warehouse' }

export default async function ShipmentPage() {
  const result = await getApprovedWRForShipment()
  const releases = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pengiriman Barang</h1>
        <p className="text-sm text-muted-foreground">
          Warehouse Release yang sudah disetujui kedua sisi. Tandai "Kirim Barang"
          setelah barang benar-benar keluar dari gudang — status WR menjadi Dikirim.
        </p>
      </div>

      <ShipmentContent releases={releases} />
    </div>
  )
}
