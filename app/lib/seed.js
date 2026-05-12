import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding database...')

  try {
    // Clear existing data (optional)
    console.log('Clearing existing data...')
    await prisma.bomHistory.deleteMany()
    await prisma.bomItem.deleteMany()
    await prisma.billOfMaterial.deleteMany()
    await prisma.user.deleteMany()

    // Create test users
    console.log('Creating test users...')
    const hashedPassword = await bcrypt.hash('password123', 10)

    const marketingUser = await prisma.user.create({
      data: {
        email: 'marketing@test.com',
        name: 'Marketing Team',
        password: hashedPassword,
        role: 'MARKETING',
      },
    })

    const engineerStaffUser = await prisma.user.create({
      data: {
        email: 'engineer.staff@test.com',
        name: 'Engineer Staff',
        password: hashedPassword,
        role: 'ENGINEER',
        engineerRole: 'STAFF',
      },
    })

    const engineerWpoUser = await prisma.user.create({
      data: {
        email: 'engineer.wpo@test.com',
        name: 'Engineer WPO',
        password: hashedPassword,
        role: 'ENGINEER',
        engineerRole: 'WPO',
      },
    })

    const engineerSystemUser = await prisma.user.create({
      data: {
        email: 'engineer.system@test.com',
        name: 'Engineer System',
        password: hashedPassword,
        role: 'ENGINEER',
        engineerRole: 'SYSTEM',
      },
    })

    const procurementUser = await prisma.user.create({
      data: {
        email: 'procurement@test.com',
        name: 'Procurement Team',
        password: hashedPassword,
        role: 'PROCUREMENT',
      },
    })

    console.log('✅ Created 5 test users')
    console.log(`   - Marketing: ${marketingUser.email}`)
    console.log(`   - Engineer (Staff): ${engineerStaffUser.email}`)
    console.log(`   - Engineer (WPO): ${engineerWpoUser.email}`)
    console.log(`   - Engineer (System): ${engineerSystemUser.email}`)
    console.log(`   - Procurement: ${procurementUser.email}`)

    // Create test BoMs
    console.log('\nCreating test BoMs...')

    const bom1 = await prisma.billOfMaterial.create({
      data: {
        bomNo: 'BOM-001-2025',
        projectId: 'PROJ-001',
        projectName: 'Bridge Construction Project',
        projectCode: '2244',
        contractNo: 'CONTRACT-2025-001',
        description: 'Main bridge construction materials',
        bomStatus: 'DRAFT',
        createdBy: marketingUser.id,
        items: {
          createMany: {
            data: [
              {
                marketingDesc: 'Steel Beam 10x10 (Grade A)',
                marketingQty: 500,
                marketingUnit: 'Kg',
                itemStatus: 'PENDING',
              },
              {
                marketingDesc: 'Cement (Portland Type I)',
                marketingQty: 2000,
                marketingUnit: 'Kg',
                itemStatus: 'PENDING',
              },
              {
                marketingDesc: 'Reinforcement Steel (Diameter 12mm)',
                marketingQty: 800,
                marketingUnit: 'Kg',
                itemStatus: 'PENDING',
              },
            ],
          },
        },
      },
      include: { items: true },
    })

    await prisma.bomHistory.create({
      data: {
        bomId: bom1.id,
        action: 'CREATED',
        performedBy: marketingUser.id,
        notes: 'BoM created for bridge construction project',
        timestamp: new Date(),
      },
    })

    const bom2 = await prisma.billOfMaterial.create({
      data: {
        bomNo: 'BOM-002-2025',
        projectId: 'PROJ-002',
        projectName: 'Office Building Renovation',
        projectCode: '2245',
        contractNo: 'CONTRACT-2025-002',
        description: 'Interior renovation materials',
        bomStatus: 'SUBMITTED',
        createdBy: marketingUser.id,
        submittedBy: marketingUser.id,
        submittedAt: new Date(),
        items: {
          createMany: {
            data: [
              {
                marketingDesc: 'Ceramic Tiles (60x60cm)',
                marketingQty: 1000,
                marketingUnit: 'Pcs',
                itemStatus: 'PENDING',
              },
              {
                marketingDesc: 'Paint (Water-based Acrylic)',
                marketingQty: 500,
                marketingUnit: 'Liter',
                itemStatus: 'PENDING',
              },
              {
                marketingDesc: 'Gypsum Board (12.5mm)',
                marketingQty: 100,
                marketingUnit: 'Pcs',
                itemStatus: 'PENDING',
              },
              {
                marketingDesc: 'Aluminum Framing (Profile Standar)',
                marketingQty: 200,
                marketingUnit: 'Meter',
                itemStatus: 'PENDING',
              },
            ],
          },
        },
      },
      include: { items: true },
    })

    await prisma.bomHistory.create({
      data: {
        bomId: bom2.id,
        action: 'CREATED',
        performedBy: marketingUser.id,
        notes: 'BoM created for office renovation',
        timestamp: new Date(Date.now() - 86400000),
      },
    })

    await prisma.bomHistory.create({
      data: {
        bomId: bom2.id,
        action: 'SUBMITTED',
        performedBy: marketingUser.id,
        notes: 'BoM submitted for engineer refinement',
        timestamp: new Date(),
      },
    })

    const bom3 = await prisma.billOfMaterial.create({
      data: {
        bomNo: 'BOM-003-2025',
        projectId: 'PROJ-003',
        projectName: 'Highway Road Extension',
        projectCode: '2246',
        contractNo: 'CONTRACT-2025-003',
        description: 'Road construction and asphalt materials',
        bomStatus: 'WPO_REVIEW',
        createdBy: marketingUser.id,
        submittedBy: marketingUser.id,
        submittedAt: new Date(Date.now() - 172800000),
        items: {
          createMany: {
            data: [
              {
                marketingDesc: 'Asphalt Concrete (Type AC-WC)',
                marketingQty: 5000,
                marketingUnit: 'Kg',
                itemStatus: 'REFINED',
              },
              {
                marketingDesc: 'Base Course Material',
                marketingQty: 3000,
                marketingUnit: 'Kg',
                itemStatus: 'REFINED',
              },
              {
                marketingDesc: 'Road Marking Paint (White)',
                marketingQty: 100,
                marketingUnit: 'Liter',
                itemStatus: 'PENDING',
              },
            ],
          },
        },
      },
      include: { items: true },
    })

    await prisma.bomHistory.create({
      data: {
        bomId: bom3.id,
        action: 'CREATED',
        performedBy: marketingUser.id,
        notes: 'BoM created for highway project',
        timestamp: new Date(Date.now() - 172800000),
      },
    })

    await prisma.bomHistory.create({
      data: {
        bomId: bom3.id,
        action: 'SUBMITTED',
        performedBy: marketingUser.id,
        notes: 'BoM submitted for refinement',
        timestamp: new Date(Date.now() - 86400000),
      },
    })

    console.log('✅ Created 3 test BoMs')
    console.log(`   - BOM-001-2025: Draft (3 items)`)
    console.log(`   - BOM-002-2025: Submitted (4 items)`)
    console.log(`   - BOM-003-2025: WPO Review (3 items)`)

    console.log('\n✨ Database seeded successfully!')
    console.log('\n📝 Test Credentials:')
    console.log('   Email: marketing@test.com | Role: MARKETING')
    console.log('   Email: engineer.staff@test.com | Role: ENGINEER (STAFF)')
    console.log('   Email: engineer.wpo@test.com | Role: ENGINEER (WPO)')
    console.log('   Email: engineer.system@test.com | Role: ENGINEER (SYSTEM)')
    console.log('   Email: procurement@test.com | Role: PROCUREMENT')
    console.log('   Password: password123')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
