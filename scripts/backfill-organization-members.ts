/**
 * V7 vòng 1 — backfill 1 OrganizationMember(role=OWNER) cho mỗi Provider đã tồn tại trước khi
 * bảng `organization_members` ra đời, để không ai bị mất quyền quản lý sau khi deploy.
 *
 * Cách dùng: npm run org-members:backfill
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    // Chỉ Provider đã từng được duyệt (APPROVED/SUSPENDED) mới có membership — khớp hành vi
    // mới: OWNER chỉ được tạo lúc APPROVE (xem provider.repository.ts#approveAndCreateOwnerMembership).
    const providers = await prisma.provider.findMany({
      where: { status: { in: ['APPROVED', 'SUSPENDED'] } },
      select: { id: true, userId: true, name: true },
    });

    let created = 0;
    let skipped = 0;

    for (const provider of providers) {
      const existing = await prisma.organizationMember.findUnique({
        where: { userId: provider.userId },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.organizationMember.create({
        data: { providerId: provider.id, userId: provider.userId, role: 'OWNER' },
      });
      created += 1;
      console.log(`Đã tạo OWNER membership cho Provider "${provider.name}" (id=${provider.id})`);
    }

    console.log(`Xong: tạo mới ${created}, bỏ qua ${skipped} (đã có membership từ trước).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Backfill thất bại:', error.message ?? error);
  process.exit(1);
});
