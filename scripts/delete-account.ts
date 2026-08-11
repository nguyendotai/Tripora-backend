/**
 * Delete an account. Soft delete by default (sets deleted_at, đúng quy
 * ước soft-delete dùng chung toàn hệ thống); đặt `hardDelete = true` để
 * xoá vĩnh viễn (xoá luôn refresh token liên quan trước).
 *
 * Cách dùng: sửa `email` và `hardDelete` bên dưới rồi chạy:
 *   npm run account:delete
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// ==================== CONFIG — sửa thông tin ở đây ====================
const email = 'user@tripora.dev'; // tài khoản cần xoá
const hardDelete = false; // true = xoá vĩnh viễn, không khôi phục được
// ========================================================================

async function main() {
  if (!email) {
    throw new Error('Sửa biến `email` trong file này để chỉ định tài khoản cần xoá');
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      throw new Error(`Không tìm thấy tài khoản: ${email}`);
    }

    if (!hardDelete && existing.deletedAt) {
      console.log(`Tài khoản đã bị soft-delete từ trước (lúc ${existing.deletedAt.toISOString()}).`);
      return;
    }

    if (hardDelete) {
      await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
      console.log(`Đã xoá vĩnh viễn tài khoản: ${existing.email} (id=${existing.id})`);
    } else {
      await prisma.refreshToken.updateMany({
        where: { userId: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
      console.log(`Đã soft-delete tài khoản: ${user.email} (id=${user.id})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Xoá tài khoản thất bại:', error.message ?? error);
  process.exit(1);
});
