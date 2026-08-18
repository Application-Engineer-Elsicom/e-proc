import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getBomStatusLabel } from '@/lib/permissions'

export const metadata = {
  title: 'Dashboard Marketing',
  description: 'Dashboard untuk marketing team',
}

export default async function MarketingDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'MARKETING') {
    redirect('/login')
  }

  // Fetch user's BoMs
  const boms = await prisma.billOfMaterial.findMany({
    where: { createdBy: session.user.id },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Setiap status BoM harus masuk tepat satu kotak, kalau tidak jumlah kotak
  // tidak akan sama dengan Total dan pengguna kehilangan jejak dokumennya.
  // Status yang sedang berjalan di Engineer/Procurement digabung jadi "Diproses".
  const REJECTED_STATUSES = ['REJECTED', 'WPO_REJECTED', 'SYSTEM_REJECTED']
  const countOf = (...statuses) =>
    boms.filter((b) => statuses.includes(b.bomStatus)).length

  const stats = {
    total: boms.length,
    draft: countOf('DRAFT'),
    diproses: countOf(
      'SUBMITTED', 'WPO_REVIEW', 'WPO_APPROVED',
      'SYSTEM_REVIEW', 'SYSTEM_APPROVED', 'ACTIVE',
    ),
    priced: countOf('PRICED'),
    ditolak: countOf(...REJECTED_STATUSES),
    archived: countOf('ARCHIVED'),
  }

  const recentBoms = boms.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">Halo, {session.user.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola Bill of Material dan pantau status persetujuannya
        </p>
      </div>

      {/* Kartu statistik — Draft + Diproses + Sudah Diharga + Ditolak + Arsip = Total */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total BoM',     value: stats.total },
          { label: 'Draft',         value: stats.draft },
          { label: 'Diproses',      value: stats.diproses },
          { label: 'Sudah Diharga', value: stats.priced },
          { label: 'Ditolak',       value: stats.ditolak },
          { label: 'Diarsipkan',    value: stats.archived },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">BoM Terbaru</h3>
        <Link
          href="/marketing/bom/create"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          + Buat BoM Baru
        </Link>
      </div>

      {/* Recent BoMs Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {recentBoms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">No. BoM</th>
                  <th className="px-5 py-3 font-medium">Proyek</th>
                  <th className="px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Dibuat</th>
                  <th className="px-5 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentBoms.map((bom) => (
                  <tr key={bom.id} className="border-b last:border-0 transition-colors hover:bg-accent/40">
                    <td className="px-5 py-3 font-medium text-foreground">{bom.bomNo}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{bom.projectName}</p>
                      <p className="text-xs text-muted-foreground">{bom.projectCode}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{bom._count.items} item</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {getBomStatusLabel(bom.bomStatus)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(bom.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/marketing/bom/${bom.id}`} className="font-medium text-primary hover:underline">
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <p className="mb-3 text-sm text-muted-foreground">Belum ada BoM dibuat.</p>
            <Link href="/marketing/bom/create" className="text-sm font-medium text-primary hover:underline">
              Buat BoM pertama Anda
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
