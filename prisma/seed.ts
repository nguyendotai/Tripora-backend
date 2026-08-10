// Seed cho Development & Testing (database.md mục 5) — idempotent, không dùng cho Production.
import { PartnerBusinessType, PartnerVerificationStatus, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEV_PASSWORD = 'Passw0rd!';

const DESTINATIONS = [
  {
    name: 'Đà Nẵng',
    slug: 'da-nang',
    country: 'Vietnam',
    latitude: 16.0544,
    longitude: 108.2022,
    tags: ['beach', 'food', 'family'],
    bestTime: ['March', 'April', 'May'],
  },
  {
    name: 'Hội An',
    slug: 'hoi-an',
    country: 'Vietnam',
    latitude: 15.8801,
    longitude: 108.338,
    tags: ['heritage', 'food'],
    bestTime: ['February', 'March', 'April'],
  },
  {
    name: 'Phú Quốc',
    slug: 'phu-quoc',
    country: 'Vietnam',
    latitude: 10.227,
    longitude: 103.967,
    tags: ['beach', 'island'],
    bestTime: ['November', 'December', 'January'],
  },
  {
    name: 'Sa Pa',
    slug: 'sa-pa',
    country: 'Vietnam',
    latitude: 22.3364,
    longitude: 103.8438,
    tags: ['mountain', 'trekking'],
    bestTime: ['September', 'October'],
  },
  {
    name: 'Đà Lạt',
    slug: 'da-lat',
    country: 'Vietnam',
    latitude: 11.9404,
    longitude: 108.4583,
    tags: ['mountain', 'flowers'],
    bestTime: ['December', 'January', 'February'],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tripora.dev' },
    update: {},
    create: {
      email: 'admin@tripora.dev',
      passwordHash,
      firstName: 'Tripora',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    },
  });

  const partnerOwner = await prisma.user.upsert({
    where: { email: 'partner@tripora.dev' },
    update: {},
    create: {
      email: 'partner@tripora.dev',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Partner',
      role: UserRole.PARTNER,
    },
  });

  await prisma.partner.upsert({
    where: { ownerId: partnerOwner.id },
    update: {},
    create: {
      ownerId: partnerOwner.id,
      businessName: 'Tripora Demo Hotels',
      businessType: PartnerBusinessType.HOTEL,
      contactEmail: partnerOwner.email,
      verificationStatus: PartnerVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    },
  });

  for (const destination of DESTINATIONS) {
    await prisma.destination.upsert({
      where: { slug: destination.slug },
      update: {},
      create: destination,
    });
  }

  console.log('Seed hoàn tất:', {
    admin: admin.email,
    partnerOwner: partnerOwner.email,
    destinations: DESTINATIONS.length,
    devPassword: DEV_PASSWORD,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
