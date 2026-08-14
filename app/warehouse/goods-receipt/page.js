import { getGoodsReceiptPOs } from '../../actions/warehouse'
import GoodsReceiptContent from './GoodsReceiptContent'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Goods Receipt — Warehouse' }

export default async function GoodsReceiptPage() {
  const result = await getGoodsReceiptPOs()
  const pos = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Goods Receipt</h1>
        <p className="text-sm text-muted-foreground">
          Konfirmasi penerimaan barang per item PO. Menandai tanggal Mat In akan
          memperbarui status PO (Sebagian / Penuh diterima) secara otomatis.
        </p>
      </div>

      <GoodsReceiptContent pos={pos} />
    </div>
  )
}
