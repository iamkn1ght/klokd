/* One-off DB check + demo-data seeding for local dev. Safe to re-run. */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const p = new PrismaClient();

const TENANT = 'klokd-ke-default';

const BUSINESSES = [
  'The Brew Bistro', 'Java House', 'Artcaffe', 'Big Square', 'Mama Oliech',
  'Carnivore Restaurant', 'Talisman', 'Nyama Mama', 'About Thyme', 'Tin Roof Cafe',
];
const FIRST_NAMES = ['Akinyi', 'Wanjiku', 'Kamau', 'Otieno', 'Njeri', 'Mwangi', 'Achieng', 'Odhiambo', 'Wambui', 'Kipchoge'];
const SKILLS = ['Waiter', 'Barista', 'Chef', 'Cashier', 'Security', 'Cleaner'];
const LOCATIONS = [
  { name: 'Westlands', lat: -1.2636, lng: 36.8036 },
  { name: 'Kilimani', lat: -1.2864, lng: 36.7830 },
  { name: 'Karen', lat: -1.3197, lng: 36.7112 },
  { name: 'CBD', lat: -1.2864, lng: 36.8172 },
  { name: 'Lavington', lat: -1.2783, lng: 36.7700 },
];

async function seedEmployers() {
  for (let i = 0; i < BUSINESSES.length; i++) {
    const phone = `+2547${String(20000000 + i).padStart(8, '0')}`;
    const user = await p.user.create({ data: { tenantId: TENANT, phone, role: 'EMPLOYER' } });
    await p.employer.create({
      data: {
        tenantId: TENANT, userId: user.id, businessName: BUSINESSES[i],
        kraPin: `P0${String(51234567 + i)}A`, contactPerson: FIRST_NAMES[i],
        wibaPolicyRef: `POL-2026-${String(i + 1).padStart(3, '0')}`, wibaInsurer: 'Jubilee',
        wibaPolicyExpiry: new Date('2027-12-31'),
        totalShifts: 5 + Math.floor(Math.random() * 60),
        ratingAggregate: 4.2 + Math.random() * 0.7,
        ratingCount: 3 + Math.floor(Math.random() * 20),
      },
    });
  }
}

async function seedWorkers() {
  for (let i = 0; i < 30; i++) {
    const phone = `+2547${String(10000000 + i).padStart(8, '0')}`;
    const user = await p.user.create({ data: { tenantId: TENANT, phone, role: 'WORKER' } });
    const workerSkills = [SKILLS[i % SKILLS.length], SKILLS[(i + 1) % SKILLS.length]];
    await p.worker.create({
      data: {
        tenantId: TENANT, userId: user.id,
        firstName: FIRST_NAMES[i % FIRST_NAMES.length], lastName: 'K.',
        idNumberHash: crypto.createHash('sha256').update(`ID-${i}`).digest('hex'),
        verificationStatus: 'APPROVED', skills: JSON.stringify(workerSkills),
        consentIdentity: true, consentGps: true, consentedAt: new Date(),
        showUpRate: 75 + Math.floor(Math.random() * 25),
        ratingAggregate: 3.5 + Math.random() * 1.5, ratingCount: 3 + Math.floor(Math.random() * 15),
        totalShifts: Math.floor(Math.random() * 50),
      },
    });
  }
}

async function seedMinimumWages() {
  for (const sector of SKILLS) {
    await p.minimumWage.create({
      data: { tenantId: TENANT, sector: sector.toLowerCase(), location: 'nairobi', rateKes: 1000, effectiveFrom: new Date() },
    });
  }
}

async function seedShifts() {
  const employers = await p.employer.findMany({ where: { tenantId: TENANT }, take: 10 });
  if (employers.length === 0) throw new Error('seedShifts: no employers — run employer seed first');
  for (let i = 0; i < 15; i++) {
    const emp = employers[i % employers.length];
    const loc = LOCATIONS[i % LOCATIONS.length];
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1 + (i % 3));
    const start = new Date(tomorrow); start.setHours(8 + (i % 3) * 4, 0, 0, 0);
    const end = new Date(start); end.setHours(start.getHours() + 5);

    await p.shift.create({
      data: {
        tenantId: TENANT, employerId: emp.id,
        role: SKILLS[i % SKILLS.length],
        description: `${SKILLS[i % SKILLS.length]} needed at ${emp.businessName}`,
        date: tomorrow, startTime: start, endTime: end,
        rateKes: 1200 + (i % 5) * 200,
        locationLat: loc.lat + (Math.random() - 0.5) * 0.01,
        locationLng: loc.lng + (Math.random() - 0.5) * 0.01,
        locationName: loc.name, geoHash: `kzf${i}`,
        status: 'POSTED',
      },
    });
  }
}

(async () => {
  const counts = {
    workers: await p.worker.count(),
    employers: await p.employer.count(),
    shifts: await p.shift.count(),
    users: await p.user.count(),
  };
  console.log('before:', JSON.stringify(counts));

  if (counts.employers < BUSINESSES.length) await seedEmployers();
  if (counts.workers < 30) await seedWorkers();
  if ((await p.minimumWage.count()) < SKILLS.length) await seedMinimumWages();
  if (counts.shifts < 15) await seedShifts();

  console.log('after:', JSON.stringify({
    workers: await p.worker.count(),
    employers: await p.employer.count(),
    shifts: await p.shift.count(),
  }));
})()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
