/**
 * Create a User/Admin account directly in the database.
 *
 * Cách dùng: sửa các giá trị trong khối CONFIG bên dưới rồi chạy:
 *   npm run account:create
 */
import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// ==================== CONFIG — sửa thông tin ở đây ====================
const email = 'admin@tripora.dev';
const password = 'Admin123'; // tối thiểu 6 ký tự
const role: Role = Role.ADMIN; // Role.USER hoặc Role.ADMIN
const firstName: string | undefined = 'Admin';
const lastName: string | undefined = 'Tripora';
// ========================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new Error('email không hợp lệ — sửa biến `email` trong file này');
  }
  if (!password || password.length < 6) {
    throw new Error('password phải tối thiểu 6 ký tự — sửa biến `password` trong file này');
  }
  if (!Object.values(Role).includes(role)) {
    throw new Error(`role phải là một trong: ${Object.values(Role).join(', ')}`);
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error(`Email đã tồn tại: ${email} (id=${existing.id})`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, role, firstName, lastName },
    });

    console.log('Đã tạo tài khoản:');
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
  console.error('Tạo tài khoản thất bại:', error.message ?? error);
  process.exit(1);
});
