/**
 * Beta Cohort Seed Script
 * Creates 50 employers + 200 workers with realistic Nairobi data.
 *
 * Run: npx ts-node scripts/seed-beta.ts
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const TENANT_ID = 'klokd-ke-default';

const BUSINESS_NAMES = [
  'The Brew Bistro', 'Java House', 'Artcaffe', 'Big Square', 'Mama Oliech',
  'Carnivore Restaurant', 'Talisman', 'Habesha', 'Nyama Mama', 'About Thyme',
  'Cedars Restaurant', 'Tin Roof Cafe', 'Sierra Brasserie', 'The Alchemist',
  'Hero Restaurant', 'Fogo Gaucho', 'Urban Eatery', 'Cultiva', 'Pango',
  'Lord Erroll', 'Mediterraneo', 'Tamarind', 'Sarova Stanley', 'Norfolk Hotel',
  'Tribe Hotel', 'Sankara Hotel', 'Fairmont Norfolk', 'Villa Rosa Kempinski',
  'Radisson Blu', 'Crowne Plaza', 'Hilton Garden Inn', 'Holiday Inn',
  'Best Western', 'Southern Sun', 'PrideInn Hotels', 'Eka Hotel',
  'Laico Regency', 'Sarova Panafric', 'Nairobi Serena', 'InterContinental',
  'The Hub Karen', 'Westgate Mall', 'Garden City', 'Two Rivers',
  'Junction Mall', 'Sarit Centre', 'Village Market', 'Yaya Centre',
  'The Oval', 'Capital Centre',
];

const FIRST_NAMES = [
  'Akinyi', 'Wanjiku', 'Kamau', 'Otieno', 'Njeri', 'Mwangi', 'Achieng', 'Odhiambo',
  'Wambui', 'Kipchoge', 'Chebet', 'Mutua', 'Nyambura', 'Omondi', 'Adhiambo', 'Kimani',
  'Moraa', 'Kiplagat', 'Cherono', 'Gitau', 'Wairimu', 'Onyango', 'Kerubo', 'Maina',
  'Nekesa', 'Barasa', 'Jeptoo', 'Rotich', 'Nyokabi', 'Kariuki',
];

const LAST_NAMES = [
  'K.', 'M.', 'O.', 'W.', 'N.', 'G.', 'C.', 'R.', 'B.', 'A.',
  'J.', 'L.', 'S.', 'T.', 'P.', 'D.', 'H.', 'F.', 'E.', 'I.',
];

const SKILLS = ['Waiter', 'Barista', 'Chef', 'Cashier', 'Security', 'Cleaner', 'Receptionist', 'Bartender'];

const LOCATIONS = [
  { name: 'Westlands', lat: -1.2636, lng: 36.8036 },
  { name: 'Kilimani', lat: -1.2864, lng: 36.7830 },
  { name: 'Karen', lat: -1.3197, lng: 36.7112 },
  { name: 'CBD', lat: -1.2864, lng: 36.8172 },
  { name: 'Lavington', lat: -1.2783, lng: 36.7700 },
  { name: 'Kileleshwa', lat: -1.2722, lng: 36.7800 },
  { name: 'Parklands', lat: -1.2580, lng: 36.8120 },
  { name: 'Hurlingham', lat: -1.2950, lng: 36.7950 },
];

function randomPhone(): string {
  const prefixes = ['0722', '0733', '0712', '0723', '0711', '0726', '0728', '0738'];
  return prefixes[Math.floor(Math.random() * prefixes.length)] +
    Math.floor(100000 + Math.random() * 899999).toString();
}

function randomKraPin(): string {
  const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letter[Math.floor(Math.random() * 26)] +
    Math.floor(100000000 + Math.random() * 899999999).toString() +
    letter[Math.floor(Math.random() * 26)];
}

async function seed() {
  console.log('🌱 Seeding beta cohort...\n');

  // Seed minimum wages
  const sectors = ['waiter', 'barista', 'chef', 'cashier', 'security', 'cleaner', 'receptionist', 'bartender'];
  for (const sector of sectors) {
    await prisma.minimumWage.upsert({
      where: { tenantId_sector_location: { tenantId: TENANT_ID, sector, location: 'nairobi' } },
      create: { tenantId: TENANT_ID, sector, location: 'nairobi', rateKes: 1000, effectiveFrom: new Date() },
      update: {},
    });
  }
  console.log(`✓ ${sectors.length} minimum wage rates seeded`);

  // Seed 50 employers
  for (let i = 0; i < 50; i++) {
    const phone = randomPhone();
    const user = await prisma.user.create({
      data: { tenantId: TENANT_ID, phone, role: 'EMPLOYER' },
    });

    const loc = LOCATIONS[i % LOCATIONS.length];
    await prisma.employer.create({
      data: {
        tenantId: TENANT_ID,
        userId: user.id,
        businessName: BUSINESS_NAMES[i],
        kraPin: randomKraPin(),
        contactPerson: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
        wibaPolicyRef: `POL-2026-${String(i + 1).padStart(3, '0')}`,
        wibaInsurer: ['Jubilee', 'Britam', 'APA', 'CIC', 'UAP'][i % 5],
        wibaPolicyExpiry: new Date('2027-12-31'),
        mpesaMethod: ['paybill', 'till', 'personal'][i % 3],
        mpesaAccountEnc: Buffer.from(randomPhone()).toString('base64'),
      },
    });
  }
  console.log('✓ 50 employers seeded');

  // Seed 200 workers
  for (let i = 0; i < 200; i++) {
    const phone = randomPhone();
    const user = await prisma.user.create({
      data: { tenantId: TENANT_ID, phone, role: 'WORKER' },
    });

    const numSkills = 1 + Math.floor(Math.random() * 3);
    const shuffled = [...SKILLS].sort(() => Math.random() - 0.5);
    const workerSkills = shuffled.slice(0, numSkills);

    await prisma.worker.create({
      data: {
        tenantId: TENANT_ID,
        userId: user.id,
        firstName: FIRST_NAMES[i % FIRST_NAMES.length],
        lastName: LAST_NAMES[i % LAST_NAMES.length],
        idNumberHash: crypto.createHash('sha256').update(`ID-${i}`).digest('hex'),
        verificationStatus: i < 180 ? 'APPROVED' : 'PENDING',
        skills: JSON.stringify(workerSkills),
        consentIdentity: true,
        consentGps: true,
        consentedAt: new Date(),
        mpesaNumberEnc: Buffer.from(phone).toString('base64'),
        showUpRate: 75 + Math.floor(Math.random() * 25),
        ratingAggregate: i >= 3 ? 3.5 + Math.random() * 1.5 : null,
        ratingCount: Math.floor(Math.random() * 20),
        totalShifts: Math.floor(Math.random() * 50),
      },
    });
  }
  console.log('✓ 200 workers seeded (180 approved, 20 pending)');

  // Create admin user
  const adminUser = await prisma.user.create({
    data: { tenantId: TENANT_ID, phone: '0700000001', role: 'ADMIN' },
  });
  console.log(`✓ Admin user created (phone: 0700000001, id: ${adminUser.id})`);

  console.log('\n🎉 Beta cohort seeded successfully!');
  console.log('   50 employers · 200 workers · 1 admin');
  console.log('   Minimum wages set for Nairobi hospitality sector');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
