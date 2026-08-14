import { getInvoices } from '../actions/finance'
import FinanceContent from './FinanceContent'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Finance — Invoice PO' }

export default async function FinancePage() {
  const [unpaidRes, paidRes] = await Promise.all([
    getInvoices(false),
    getInvoices(true),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pembayaran Invoice PO</h1>
        <p className="text-sm text-muted-foreground">
          Daftar invoice dari Purchase Order. Tandai lunas setelah pembayaran ke
          supplier dilakukan.
        </p>
      </div>

      <FinanceContent
        unpaid={unpaidRes.success ? unpaidRes.data : []}
        paid={paidRes.success ? paidRes.data : []}
      />
    </div>
  )
}
