const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  
  // Roles to create
  const users = [
    { username: 'engineer1', name: 'Dadang Engineer', role: 'ENGINEER', position: 'Senior Engineer' },
    { username: 'wpo1', name: 'Budi WPO', role: 'WPO', position: 'WPO Manager' },
    { username: 'pm1', name: 'Agus PM', role: 'PROJECT_MANAGER', position: 'Project Manager' },
    { username: 'proc1', name: 'Siti Procurement', role: 'PROCUREMENT', position: 'Procurement Specialist' },
    { username: 'fin1', name: 'Lia Finance', role: 'FINANCE', position: 'Finance Controller' },
    { username: 'wh1', name: 'Joni Warehouse', role: 'WAREHOUSE', position: 'Warehouse Keeper' },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        username: userData.username,
        password: password,
        name: userData.name,
        role: userData.role,
        position: userData.position,
      },
    });
    console.log(`User created/updated: ${user.username} (${user.role})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
