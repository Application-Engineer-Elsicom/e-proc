import { getWRForWarehouseApproval } from '../../actions/warehouse'
import WRApprovalList from '../../components/WRApprovalList'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Approval WR — Warehouse' }

export default async function WarehouseWRApprovalPage() {
  const result = await getWRForWarehouseApproval()
  const releases = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approval Warehouse Release</h1>
        <p className="text-sm text-muted-foreground">
          Verifikasi ketersediaan fisik barang, lalu setujui atau tolak. Persetujuan
          Procurement berjalan terpisah — WR final setelah kedua sisi setuju.
        </p>
      </div>

      <WRApprovalList releases={releases} side="WAREHOUSE" />
    </div>
  )
}
