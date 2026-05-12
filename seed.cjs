const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    console.log('Clearing existing data...');
    await prisma.bomHistory.deleteMany();
    await prisma.bomSubItem.deleteMany();
    await prisma.bomItem.deleteMany();
    await prisma.billOfMaterial.deleteMany();
    await prisma.user.deleteMany();

    console.log('Creating test users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const marketingUser = await prisma.user.create({
      data: {
        username: 'marketing@test.com',
        name: 'Marketing Team',
        password: hashedPassword,
        role: 'MARKETING',
      },
    });

    const engineerStaffUser = await prisma.user.create({
      data: {
        username: 'engineer.staff@test.com',
        name: 'Engineer Staff',
        password: hashedPassword,
        role: 'ENGINEER',
        engineerRole: 'STAFF',
      },
    });

    const engineerWpoUser = await prisma.user.create({
      data: {
        username: 'engineer.wpo@test.com',
        name: 'Engineer WPO',
        password: hashedPassword,
        role: 'ENGINEER',
        engineerRole: 'WPO',
      },
    });

    const engineerSystemUser = await prisma.user.create({
      data: {
        username: 'engineer.system@test.com',
        name: 'Engineer System',
        password: hashedPassword,
        role: 'ENGINEER',
        engineerRole: 'SYSTEM',
      },
    });

    const procurementUser = await prisma.user.create({
      data: {
        username: 'procurement@test.com',
        name: 'Procurement Team',
        password: hashedPassword,
        role: 'PROCUREMENT',
      },
    });

    console.log('✅ Created 5 test users');
    console.log(`   - Marketing: ${marketingUser.username}`);
    console.log(`   - Engineer (Staff): ${engineerStaffUser.username}`);
    console.log(`   - Engineer (WPO): ${engineerWpoUser.username}`);
    console.log(`   - Engineer (System): ${engineerSystemUser.username}`);
    console.log(`   - Procurement: ${procurementUser.username}`);

    console.log('\nCreating test BoMs...');

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
                marketingDesc: 'Steel Beam (Grade A)',
                itemStatus: 'PENDING',
              },
              {
                marketingDesc: 'Cement (Portland Type I)',
                itemStatus: 'PENDING',
              },
              {
                marketingDesc: 'Reinforcement Steel',
                itemStatus: 'PENDING',
              },
            ],
          },
        },
      },
      include: { items: true },
    });

    await prisma.bomHistory.create({
      data: {
        bomId: bom1.id,
        action: 'CREATED',
        performedBy: marketingUser.id,
        details: 'BoM created for bridge construction project',
        timestamp: new Date(),
      },
    });

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
        assignedToStaff: engineerStaffUser.id,
        items: {
          createMany: {
            data: [
              {
                marketingDesc: 'Ceramic Tiles',
                itemStatus: 'PENDING',
              },
              {
                marketingDesc: 'Wall Paint',
                itemStatus: 'PENDING',
              },
              {
                marketingDesc: 'Gypsum Board & Framing',
                itemStatus: 'PENDING',
              },
            ],
          },
        },
      },
      include: { items: true },
    });

    await prisma.bomHistory.create({
      data: {
        bomId: bom2.id,
        action: 'CREATED',
        performedBy: marketingUser.id,
        details: 'BoM created for office renovation',
        timestamp: new Date(Date.now() - 86400000),
      },
    });

    await prisma.bomHistory.create({
      data: {
        bomId: bom2.id,
        action: 'SUBMITTED',
        performedBy: marketingUser.id,
        details: 'BoM submitted for engineer refinement',
        timestamp: new Date(),
      },
    });

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
                // Direct-fill by engineer
                marketingDesc: 'Asphalt Concrete',
                itemStatus: 'REFINED',
                hasSubItems: false,
                refinedQty: 5000,
                refinedUnit: 'Kg',
                specifications: 'Type AC-WC, Bina Marga spec',
                refinedBy: engineerStaffUser.id,
                refinedAtStaff: new Date(Date.now() - 86400000),
              },
              {
                // Direct-fill by engineer
                marketingDesc: 'Base Course Material',
                itemStatus: 'REFINED',
                hasSubItems: false,
                refinedQty: 3000,
                refinedUnit: 'Kg',
                specifications: 'Gradasi A, CBR min 80%',
                refinedBy: engineerStaffUser.id,
                refinedAtStaff: new Date(Date.now() - 86400000),
              },
              {
                // Direct-fill by engineer
                marketingDesc: 'Road Marking Paint',
                itemStatus: 'REFINED',
                hasSubItems: false,
                refinedQty: 100,
                refinedUnit: 'Liter',
                specifications: 'Thermoplastic white, retroreflective',
                refinedBy: engineerStaffUser.id,
                refinedAtStaff: new Date(Date.now() - 86400000),
              },
            ],
          },
        },
      },
      include: { items: true },
    });

    await prisma.bomHistory.create({
      data: {
        bomId: bom3.id,
        action: 'CREATED',
        performedBy: marketingUser.id,
        details: 'BoM created for highway project',
        timestamp: new Date(Date.now() - 172800000),
      },
    });

    await prisma.bomHistory.create({
      data: {
        bomId: bom3.id,
        action: 'SUBMITTED',
        performedBy: marketingUser.id,
        details: 'BoM submitted for refinement',
        timestamp: new Date(Date.now() - 86400000),
      },
    });

    // BOM-004: ACTIVE — ready for procurement pricing
    const bom4 = await prisma.billOfMaterial.create({
      data: {
        bomNo: 'BOM-004-2025',
        projectId: 'PROJ-004',
        projectName: 'Data Center Infrastructure',
        projectCode: '2247',
        contractNo: 'CONTRACT-2025-004',
        description: 'Server room equipment and cabling',
        bomStatus: 'ACTIVE',
        createdBy: marketingUser.id,
        submittedBy: marketingUser.id,
        submittedAt: new Date(Date.now() - 259200000),
        wpoApprovedBy: engineerWpoUser.id,
        wpoApprovedAt: new Date(Date.now() - 86400000),
        systemApprovedBy: engineerSystemUser.id,
        systemApprovedAt: new Date(Date.now() - 43200000),
        items: {
          createMany: {
            data: [
              {
                // Direct-fill item — simple, single qty
                marketingDesc: 'Server Rack',
                itemStatus: 'APPROVED',
                hasSubItems: false,
                refinedQty: 4,
                refinedUnit: 'Unit',
                specifications: 'Standard 19-inch rack, 42U, lockable, with PDU',
                notes: 'Supplier lokal preferred',
                refinedBy: engineerStaffUser.id,
                refinedAtStaff: new Date(Date.now() - 129600000),
              },
              {
                // Sub-items item — UPS broken into main unit + battery
                marketingDesc: 'UPS & Power Backup',
                itemStatus: 'APPROVED',
                hasSubItems: true,
                refinedBy: engineerStaffUser.id,
                refinedAtStaff: new Date(Date.now() - 129600000),
              },
              {
                // Direct-fill item
                marketingDesc: 'Network Cabling',
                itemStatus: 'APPROVED',
                hasSubItems: false,
                refinedQty: 8,
                refinedUnit: 'Roll',
                specifications: 'Cat6 UTP, 305m/roll, certified',
                notes: 'Dikurangi dari 10 roll setelah survey lapangan',
                refinedBy: engineerStaffUser.id,
                refinedAtStaff: new Date(Date.now() - 129600000),
              },
            ],
          },
        },
      },
      include: { items: true },
    });

    // Create sub-items for the "UPS & Power Backup" item in BOM-004
    const upsItem = bom4.items.find(i => i.marketingDesc === 'UPS & Power Backup');
    if (upsItem) {
      await prisma.bomSubItem.createMany({
        data: [
          {
            bomItemId: upsItem.id,
            description: 'Online UPS 10KVA',
            qty: 2,
            unit: 'Unit',
            specifications: 'Online UPS, 10KVA, pure sine wave, input 3-phase',
            sortOrder: 0,
          },
          {
            bomItemId: upsItem.id,
            description: 'External Battery Pack',
            qty: 4,
            unit: 'Unit',
            specifications: 'Battery pack for UPS, runtime +30 min at full load',
            sortOrder: 1,
          },
          {
            bomItemId: upsItem.id,
            description: 'PDU (Power Distribution Unit)',
            qty: 4,
            unit: 'Unit',
            specifications: 'Rack-mount PDU, 16A, 8 outlets, with metering',
            sortOrder: 2,
          },
        ],
      });
    }

    await prisma.bomHistory.createMany({
      data: [
        { bomId: bom4.id, action: 'CREATED', performedBy: marketingUser.id, details: 'BoM created', timestamp: new Date(Date.now() - 259200000) },
        { bomId: bom4.id, action: 'SUBMITTED', performedBy: marketingUser.id, details: 'Submitted for refinement', timestamp: new Date(Date.now() - 172800000) },
        { bomId: bom4.id, action: 'REFINEMENT_COMPLETE', performedBy: engineerStaffUser.id, details: 'All items refined', timestamp: new Date(Date.now() - 129600000) },
        { bomId: bom4.id, action: 'WPO_APPROVED', performedBy: engineerWpoUser.id, details: 'Approved by WPO', timestamp: new Date(Date.now() - 86400000) },
        { bomId: bom4.id, action: 'SYSTEM_APPROVED', performedBy: engineerSystemUser.id, details: 'Activated by System - ready for procurement', timestamp: new Date(Date.now() - 43200000) },
      ],
    });

    console.log('✅ Created 4 test BoMs');
    console.log(`   - BOM-001-2025: Draft (3 items)`);
    console.log(`   - BOM-002-2025: Submitted (4 items)`);
    console.log(`   - BOM-003-2025: WPO Review (3 items)`);
    console.log(`   - BOM-004-2025: ACTIVE/ready for Procurement (3 items)`);

    console.log('\n✨ Database seeded successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('   Username: marketing@test.com | Role: MARKETING');
    console.log('   Username: engineer.staff@test.com | Role: ENGINEER (STAFF)');
    console.log('   Username: engineer.wpo@test.com | Role: ENGINEER (WPO)');
    console.log('   Username: engineer.system@test.com | Role: ENGINEER (SYSTEM)');
    console.log('   Username: procurement@test.com | Role: PROCUREMENT');
    console.log('   Password: password123');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
