/**
 * Delete an account. Soft delete by default (sets deleted_at, matches
 * the soft-delete convention used across the app); pass --hard to
 * permanently remove the row (also deletes its refresh tokens first).
 *
 * Usage:
 *   npm run account:delete -- --email=user@tripora.dev
 *   npm run account:delete -- --email=user@tripora.dev --hard
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { parseArgs } from './utils/parse-args';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = typeof args.email === 'string' ? args.email.trim() : undefined;
  const id = typeof args.id === 'string' ? args.id.trim() : undefined;
  const hard = args.hard === true;

  if (!email && !id) {
    throw new Error('Provide --email=<email> or --id=<id> to identify the account');
  }

  const prisma = new PrismaClient();

  try {
    const where = id ? { id: BigInt(id) } : { email };
    const existing = await prisma.user.findUnique({ where });
    if (!existing) {
      throw new Error(`Account not found: ${email ?? `id=${id}`}`);
    }

    if (!hard && existing.deletedAt) {
      console.log(`Account already soft-deleted at ${existing.deletedAt.toISOString()}.`);
      return;
    }

    if (hard) {
      await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
      console.log(`Account permanently deleted: ${existing.email} (id=${existing.id})`);
    } else {
      await prisma.refreshToken.updateMany({
        where: { userId: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
      console.log(`Account soft-deleted: ${user.email} (id=${user.id})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to delete account:', error.message ?? error);
  process.exit(1);
});
