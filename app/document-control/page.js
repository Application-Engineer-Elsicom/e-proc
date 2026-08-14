import { getMRsForRegistration, getRegisteredMRs } from '../actions/document-control'
import DocControlContent from './DocControlContent'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Document Control — Registrasi MR' }

export default async function DocumentControlPage() {
  const [pendingRes, registeredRes] = await Promise.all([
    getMRsForRegistration(),
    getRegisteredMRs(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Registrasi Material Request</h1>
        <p className="text-sm text-muted-foreground">
          Catat Doc. Control No resmi dan Date Released untuk MR yang sudah disetujui
          Project Manager. Cakupan Document Control hanya penomoran dokumen MR.
        </p>
      </div>

      <DocControlContent
        pending={pendingRes.success ? pendingRes.data : []}
        registered={registeredRes.success ? registeredRes.data : []}
      />
    </div>
  )
}
