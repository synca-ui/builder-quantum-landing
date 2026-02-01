import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDashboardDataSimple() {
  console.log('🎯 Seeding Dashboard & Analytics Data (Simplified)...');

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
    console.log('📊 Dashboard endpoints:');
    console.log(`   - GET /api/dashboard/insights/overview?businessId=${businessId}`);
    console.log(`   - GET /api/dashboard/floor-plan/plans?businessId=${businessId}`);
    console.log('');
    console.log('⚠️  Note: Dashboard tables (analyticsSnapshot, floorPlan, table, etc.) need to be created first');
    console.log('   Run: npx prisma db push --force-reset && npx prisma generate');
    console.log('   Then run this seed again for full dashboard data');

  } catch (error) {
    console.error('❌ Error seeding basic dashboard data:', error);
    throw error;
  }
}

// Run standalone if called directly
if (require.main === module) {
  seedDashboardDataSimple()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
