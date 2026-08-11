/**
 * Update an existing account — change role, status, password, or name.
 *
 * Cách dùng: sửa `email` (tài khoản cần sửa) và các giá trị trong `updates`
 * bên dưới rồi chạy:
 *   npm run account:update
 *
 * Chỉ field nào khác `undefined` trong `updates` mới được cập nhật.
 */
import 'dotenv/config';
import { PrismaClient, Role, UserStatus, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// ==================== CONFIG — sửa thông tin ở đây ====================
const email = 'user@tripora.dev'; // tài khoản cần sửa

const updates = {
  role: undefined as Role | undefined, // ví dụ: Role.ADMIN
  status: undefined as UserStatus | undefined, // ví dụ: UserStatus.BANNED
  password: undefined as string | undefined, // mật khẩu mới, tối thiểu 6 ký tự
  firstName: undefined as string | undefined,
  lastName: undefined as string | undefined,
};
// ========================================================================

async function main() {
  if (!email) {
    throw new Error('Sửa biến `email` trong file này để chỉ định tài khoản cần sửa');
  }

  const data: Prisma.UserUpdateInput = {};

  if (updates.role !== undefined) {
    if (!Object.values(Role).includes(updates.role)) {
      throw new Error(`role phải là một trong: ${Object.values(Role).join(', ')}`);
    }
    data.role = updates.role;
  }

  if (updates.status !== undefined) {
    if (!Object.values(UserStatus).includes(updates.status)) {
      throw new Error(`status phải là một trong: ${Object.values(UserStatus).join(', ')}`);
    }
    data.status = updates.status;
  }

  if (updates.password !== undefined) {
    if (updates.password.length < 6) {
      throw new Error('password phải tối thiểu 6 ký tự');
    }
    data.passwordHash = await bcrypt.hash(updates.password, 10);
  }

  if (updates.firstName !== undefined) data.firstName = updates.firstName;
  if (updates.lastName !== undefined) data.lastName = updates.lastName;

  if (Object.keys(data).length === 0) {
    throw new Error(
      'Chưa có gì để cập nhật — sửa ít nhất 1 field trong `updates` (role/status/password/firstName/lastName)',
    );
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      throw new Error(`Không tìm thấy tài khoản: ${email}`);
    }

    const user = await prisma.user.update({ where: { email }, data });

    console.log('Đã cập nhật tài khoản:');
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
  console.error('Cập nhật tài khoản thất bại:', error.message ?? error);
  process.exit(1);
});
