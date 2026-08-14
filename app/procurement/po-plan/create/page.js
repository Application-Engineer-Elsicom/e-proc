import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import CreatePOForm from '../CreatePOForm'
import { getInventory } from '../../../actions/inventory'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Create Purchase Order',
  description: 'Create a new purchase order',
}

export default async function CreatePOPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'PROCUREMENT') {
    redirect('/login')
  }

  // Stok gudang untuk ditampilkan sebagai info per item (Tahap 3, minimal).
  const invResult = await getInventory()
  const inventory = invResult.success ? invResult.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
          Create Purchase Order
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Add new items to procurement plan</p>
      </div>

      <CreatePOForm inventory={inventory} />
    </div>
  )
}
