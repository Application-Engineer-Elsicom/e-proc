import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPurchaseOrderById } from '../../../actions/purchase-order'
import PODetailContent from '../PODetailContent'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  return {
    title: `PO Detail ${params.poId}`,
    description: 'Purchase order details',
  }
}

export default async function PODetailPage({ params }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'PROCUREMENT') {
    redirect('/login')
  }

  const result = await getPurchaseOrderById(params.poId)

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">PO Not Found</h1>
        </div>
        <div className="bg-red-50 dark:bg-slate-800 p-8 rounded-2xl text-center border-2 border-dashed border-red-200 dark:border-slate-700">
          <p className="text-red-700 dark:text-red-300 font-bold mb-4">{result.error}</p>
          <Link href="/procurement/po-list" className="text-blue-600 dark:text-blue-400 hover:underline">
            Back to PO List
          </Link>
        </div>
      </div>
    )
  }

  const po = result.data

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
            {po.poNumber}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {po.supplierName} • {new Date(po.poDate).toLocaleDateString('id-ID')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/procurement/po-list/${po.id}/pdf`}
            target="_blank"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition text-sm"
          >
            ⬇ PDF
          </Link>
          <Link
            href="/procurement/po-list"
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
          >
            ← Back
          </Link>
        </div>
      </div>

      <PODetailContent po={po} />
    </div>
  )
}
