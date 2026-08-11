/**
 * Update an existing account — change role, status, password, or name.
 *
 * Usage:
 *   npm run account:update -- --email=user@tripora.dev --role=ADMIN
 *   npm run account:update -- --email=user@tripora.dev --status=BANNED
 *   npm run account:update -- --email=user@tripora.dev --password=NewPass123
 *
 * Flags:
 *   --email or --id   required, identifies the account
 *   --role            USER | ADMIN
 *   --status          ACTIVE | INACTIVE | BANNED
 *   --password        new password (min 6 characters) — hashed before saving
 *   --firstName
 *   --lastName
 *
 * Only flags you pass are updated; everything else stays the same.
 */
import 'dotenv/config';
import { PrismaClient, Role, UserStatus, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { parseArgs } from './utils/parse-args';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = typeof args.email === 'string' ? args.email.trim() : undefined;
  const id = typeof args.id === 'string' ? args.id.trim() : undefined;

  if (!email && !id) {
    throw new Error('Provide --email=<email> or --id=<id> to identify the account');
  }

  const data: Prisma.UserUpdateInput = {};

  if (typeof args.role === 'string') {
    const role = args.role.toUpperCase();
    if (!Object.values(Role).includes(role as Role)) {
      throw new Error(`--role must be one of: ${Object.values(Role).join(', ')}`);
    }
    data.role = role as Role;
  }

  if (typeof args.status === 'string') {
    const status = args.status.toUpperCase();
    if (!Object.values(UserStatus).includes(status as UserStatus)) {
      throw new Error(`--status must be one of: ${Object.values(UserStatus).join(', ')}`);
    }
    data.status = status as UserStatus;
  }

  if (typeof args.password === 'string') {
    if (args.password.length < 6) {
      throw new Error('--password must be at least 6 characters');
    }
    data.passwordHash = await bcrypt.hash(args.password, 10);
  }

  if (typeof args.firstName === 'string') {
    data.firstName = args.firstName;
  }
  if (typeof args.lastName === 'string') {
    data.lastName = args.lastName;
  }

  if (Object.keys(data).length === 0) {
    throw new Error(
      'Nothing to update — pass at least one of --role/--status/--password/--firstName/--lastName',
    );
  }

  const prisma = new PrismaClient();

  try {
    const where = id ? { id: BigInt(id) } : { email };
    const existing = await prisma.user.findUnique({ where });
    if (!existing) {
      throw new Error(`Account not found: ${email ?? `id=${id}`}`);
    }

    const user = await prisma.user.update({ where, data });

    console.log('Account updated:');
    console.log({
      id: user.id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to update account:', error.message ?? error);
  process.exit(1);
});
