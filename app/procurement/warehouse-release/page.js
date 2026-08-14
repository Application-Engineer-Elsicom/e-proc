import { getWRForProcurementApproval } from '../../actions/warehouse-release'
import WRApprovalList from '../../components/WRApprovalList'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Approval WR — Procurement' }

export default async function ProcurementWRApprovalPage() {
  const result = await getWRForProcurementApproval()
  const releases = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approval Warehouse Release</h1>
        <p className="text-sm text-muted-foreground">
          Verifikasi kelengkapan pengadaan (PO/stok) untuk item WR, lalu setujui atau
          tolak. Persetujuan Warehouse berjalan terpisah — WR final setelah kedua sisi setuju.
        </p>
      </div>

      <WRApprovalList releases={releases} side="PROCUREMENT" />
    </div>
  )
}
