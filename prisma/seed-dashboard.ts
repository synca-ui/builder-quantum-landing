import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDashboardData() {
  console.log('🎯 Seeding Dashboard & Analytics Data...');

  try {
    // Get first available business or create a sample one
    let sampleBusiness = await prisma.business.findFirst({
      where: {
        status: 'PUBLISHED',
      },
    });

    // If no business exists, create a sample one
    if (!sampleBusiness) {
      console.log('📋 No business found, creating sample business...');

      // Get first user or create one
      let sampleUser = await prisma.user.findFirst();

      if (!sampleUser) {
        sampleUser = await prisma.user.create({
          data: {
            clerkId: 'sample-clerk-id-' + Date.now(),
            email: 'demo@maitr.app',
            fullName: 'Demo User',
            role: 'OWNER',
          },
        });
      }

      sampleBusiness = await prisma.business.create({
        data: {
          id: '50017eae-7b99-4e50-84e7-4fa44a9ee8f5',
          slug: 'sample-restaurant-' + Date.now(),
          name: 'Sample Restaurant',
          description: 'A demo restaurant for testing dashboard features',
          tagline: 'Delicious food, great service',
          cuisine: 'Italian',
          primaryColor: '#0d9488',
          secondaryColor: '#7c3aed',
          status: 'PUBLISHED',
          members: {
            create: {
              userId: sampleUser.id,
              role: 'OWNER',
            },
          },
        },
      });
      console.log(`✅ Created sample business: ${sampleBusiness.name}`);
    }

    const businessId = sampleBusiness.id;

    console.log(`✅ Business ready for Dashboard APIs: ${businessId}`);

    // Check if dashboard tables exist and seed them
    try {
      // Test if floorPlan model is available
      if ((prisma as any).floorPlan) {
        console.log('📊 Creating Dashboard data...');
        await seedDashboardTables(businessId);
      } else {
        console.log('⚠️  Dashboard tables not available in current Prisma client');
        console.log('   The API endpoints will use mock data until tables are created');
        console.log('   Run: npx prisma db push && npx prisma generate');
      }
    } catch (error) {
      console.warn('⚠️  Dashboard tables not ready:', (error as Error).message);
      console.log('   The API endpoints will use mock data until tables are created');
    }

    console.log('');
    console.log('📊 Dashboard endpoints ready:');
    console.log(`   - GET /api/dashboard/insights/overview?businessId=${businessId}`);
    console.log(`   - GET /api/dashboard/floor-plan/plans?businessId=${businessId}`);

  } catch (error) {
    console.error('❌ Error seeding dashboard data:', error);
    throw error;
  }
}

async function seedDashboardTables(businessId: string) {
  // 1. Create FloorPlan
  const floorPlan = await (prisma as any).floorPlan.create({
    data: {
      id: 'floor-main-dining',
      businessId: businessId,
      name: 'Main Dining Area',
      description: 'Primary dining space with 10 tables',
      width: 1000,
      height: 800,
      gridSize: 20,
      bgColor: '#f8fafc',
      sortOrder: 1,
      isActive: true,
    },
  });

  // 2. Create Tables
  const tableDefinitions = [
    { number: '1', x: 100, y: 100, shape: 'ROUND', maxCapacity: 4 },
    { number: '2', x: 300, y: 100, shape: 'ROUND', maxCapacity: 4 },
    { number: '3', x: 500, y: 100, shape: 'SQUARE', maxCapacity: 6 },
    { number: '4', x: 100, y: 300, shape: 'ROUND', maxCapacity: 2 },
    { number: '5', x: 300, y: 300, shape: 'RECTANGLE', maxCapacity: 8 },
    { number: '6', x: 500, y: 300, shape: 'ROUND', maxCapacity: 4 },
    { number: '7', x: 700, y: 100, shape: 'ROUND', maxCapacity: 4 },
    { number: '8', x: 700, y: 300, shape: 'SQUARE', maxCapacity: 6 },
  ];

  for (const tableData of tableDefinitions) {
    await (prisma as any).table.create({
      data: {
        floorPlanId: floorPlan.id,
        businessId: businessId,
        number: tableData.number,
        name: `Table ${tableData.number}`,
        x: tableData.x,
        y: tableData.y,
        rotation: 0,
        shape: tableData.shape,
        width: 80,
        height: 80,
        minCapacity: 2,
        maxCapacity: tableData.maxCapacity,
        qrEnabled: true,
        qrCode: `https://maitr.app/order/${businessId}/table-${tableData.number}`,
        status: 'AVAILABLE',
      },
    });
  }

  // 3. Create Analytics Snapshots for the last 30 days
  const today = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Generate realistic but varied data
    const baseRevenue = 450 + (Math.sin(i * 0.2) * 200) + (Math.random() * 100);
    const orders = Math.floor(15 + (Math.sin(i * 0.15) * 10) + (Math.random() * 8));
    const visitors = Math.floor(orders * (2.5 + Math.random()));

    await (prisma as any).analyticsSnapshot.create({
      data: {
        businessId: businessId,
        date,
        period: 'daily',
        revenue: baseRevenue,
        orders,
        uniqueVisitors: visitors,
        qrScans: Math.floor(orders * 1.2),
        trafficDirect: Math.floor(visitors * 0.3),
        trafficGoogle: Math.floor(visitors * 0.25),
        trafficFacebook: Math.floor(visitors * 0.15),
        trafficInstagram: Math.floor(visitors * 0.1),
        trafficQR: Math.floor(visitors * 0.15),
        trafficOther: Math.floor(visitors * 0.05),
        avgOrderValue: baseRevenue / orders,
        popularItems: JSON.stringify([
          { name: 'Margherita Pizza', count: Math.floor(Math.random() * 8) + 2 },
          { name: 'Caesar Salad', count: Math.floor(Math.random() * 6) + 1 },
          { name: 'Grilled Salmon', count: Math.floor(Math.random() * 5) + 1 },
          { name: 'Pasta Carbonara', count: Math.floor(Math.random() * 4) + 1 },
          { name: 'Tiramisu', count: Math.floor(Math.random() * 3) + 1 },
        ]),
      },
    });
  }

  // 4. Create some sample reservations
  const reservationNames = [
    'Anna Mueller', 'Hans Schmidt', 'Maria Garcia', 'John Smith',
    'Emma Wilson', 'Luca Rossi', 'Sophie Martin', 'Alex Johnson'
  ];

  for (let i = 0; i < 15; i++) {
    const reservationTime = new Date();
    reservationTime.setDate(reservationTime.getDate() + Math.floor(Math.random() * 7)); // Next 7 days
    reservationTime.setHours(18 + Math.floor(Math.random() * 4)); // 18:00-22:00
    reservationTime.setMinutes(Math.floor(Math.random() * 4) * 15); // 0, 15, 30, 45

    await (prisma as any).reservation.create({
      data: {
        businessId: businessId,
        guestName: reservationNames[Math.floor(Math.random() * reservationNames.length)],
        guestEmail: `guest${i}@example.com`,
        guestPhone: `+49 30 ${Math.floor(Math.random() * 90000000) + 10000000}`,
        guestCount: Math.floor(Math.random() * 6) + 2, // 2-8 people
        reservationTime,
        duration: 120,
        status: Math.random() > 0.8 ? 'PENDING' : 'CONFIRMED',
        source: ['website', 'phone', 'walk-in'][Math.floor(Math.random() * 3)],
      },
    });
  }

  // 5. Create some sample orders
  const menuItems = [
    { name: 'Margherita Pizza', price: 12.50 },
    { name: 'Caesar Salad', price: 9.80 },
    { name: 'Grilled Salmon', price: 18.90 },
    { name: 'Pasta Carbonara', price: 14.20 },
    { name: 'Beef Burger', price: 13.50 },
    { name: 'Tiramisu', price: 6.50 },
    { name: 'Wine (Glass)', price: 7.00 },
  ];

  const createdTables = await (prisma as any).table.findMany({
    where: { businessId: businessId },
  });

  for (let i = 0; i < 25; i++) {
    const orderTime = new Date();
    orderTime.setDate(orderTime.getDate() - Math.floor(Math.random() * 7)); // Last 7 days
    orderTime.setHours(12 + Math.floor(Math.random() * 10)); // 12:00-22:00

    const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items
    const orderItems = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const item = menuItems[Math.floor(Math.random() * menuItems.length)];
      const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 quantity
      const itemTotal = item.price * quantity;

      orderItems.push({
        name: item.name,
        price: item.price,
        quantity,
        total: itemTotal,
      });

      subtotal += itemTotal;
    }

    const tax = subtotal * 0.19; // 19% German VAT
    const tip = Math.random() > 0.3 ? subtotal * (0.05 + Math.random() * 0.1) : 0; // 5-15% tip
    const total = subtotal + tax + tip;

    await (prisma as any).order.create({
      data: {
        businessId: businessId,
        tableId: createdTables[Math.floor(Math.random() * createdTables.length)].id,
        orderNumber: `ORD-${String(i + 1).padStart(4, '0')}`,
        customerName: reservationNames[Math.floor(Math.random() * reservationNames.length)],
        subtotal,
        tax,
        tip,
        total,
        items: JSON.stringify(orderItems),
        status: ['DELIVERED', 'COMPLETED'][Math.floor(Math.random() * 2)],
        orderType: 'DINE_IN',
        source: 'qr-code',
        orderedAt: orderTime,
        deliveredAt: new Date(orderTime.getTime() + 30 * 60000), // 30 min later
      },
    });
  }

  console.log('✅ Dashboard seed data created successfully');
  console.log(`   - 1 Floor Plan with 8 Tables`);
  console.log(`   - 31 Analytics Snapshots (last 30 days)`);
  console.log(`   - 15 Sample Reservations`);
  console.log(`   - 25 Sample Orders`);
}

// Run standalone if called directly
if (require.main === module) {
  seedDashboardData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
