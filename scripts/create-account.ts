/**
 * Create a User/Admin account directly in the database.
 *
 * Usage:
 *   npm run account:create -- --email=admin@tripora.dev --password=Admin123 --role=ADMIN --firstName=Admin --lastName=Tripora
 *
 * Flags:
 *   --email       required
 *   --password    required, min 6 characters
 *   --role        USER | ADMIN (default: USER)
 *   --firstName   optional
 *   --lastName    optional
 */
import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { parseArgs } from './utils/parse-args';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = typeof args.email === 'string' ? args.email.trim() : '';
  const password = typeof args.password === 'string' ? args.password : '';
  const role = (typeof args.role === 'string' ? args.role : 'USER').toUpperCase();
  const firstName = typeof args.firstName === 'string' ? args.firstName : undefined;
  const lastName = typeof args.lastName === 'string' ? args.lastName : undefined;

  if (!email || !EMAIL_REGEX.test(email)) {
    throw new Error('--email is required and must be a valid email address');
  }
  if (!password || password.length < 6) {
    throw new Error('--password is required and must be at least 6 characters');
  }
  if (!Object.values(Role).includes(role as Role)) {
    throw new Error(`--role must be one of: ${Object.values(Role).join(', ')}`);
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error(`Email already registered: ${email} (id=${existing.id})`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role as Role,
        firstName,
        lastName,
      },
    });

    console.log('Account created:');
    console.log({
      id: user.id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to create account:', error.message ?? error);
  process.exit(1);
});
