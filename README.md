# Tripora Backend

REST API cho Tripora — NestJS + Prisma + MySQL. Roadmap theo phase: xem `../phases/README.md` (V1 → V9).

## Tech Stack
NestJS, TypeScript, Prisma ORM, MySQL (InnoDB), JWT (Access/Refresh), class-validator/class-transformer, Swagger (API Docs). Redis/BullMQ/Socket.IO/Cloudinary/SMTP sẽ thêm dần khi tới phase cần — xem `CLAUDE.md` mục 1.

Xem quy tắc phát triển đầy đủ tại `CLAUDE.md` và `../.claude/*.md`.

## Getting Started

```bash
npm install
cp .env.example .env   # chỉnh DATABASE_URL (MySQL) + JWT secret
npm run prisma:generate
npm run prisma:migrate   # cần MySQL đang chạy, khớp DATABASE_URL
npm run start:dev
```

API mặc định chạy tại `http://localhost:5550/api/v1`, Swagger docs tại `http://localhost:5550/docs`.

## Test API bằng Postman
Import cả 2 file trong `postman/` vào Postman: `tripora-api.postman_collection.json` (nhóm theo module: Auth, User, Destination) và `tripora-api.postman_environment.json` (biến `baseUrl`). Chọn environment **Tripora Local** trước khi chạy. Chạy `Auth > Register` hoặc `Login` trước — Test script tự lưu `accessToken` vào biến collection để các request sau dùng lại.

## Account Scripts (tạo/sửa/xoá tài khoản theo role)
Chưa có UI đăng ký Admin (API `register` luôn tạo role `USER`) nên dùng 3 script dưới đây để thao tác trực tiếp trên DB — hữu ích để tạo tài khoản ADMIN đầu tiên hoặc quản lý tài khoản khi cần.

```bash
# Tạo tài khoản mới
npm run account:create -- --email=admin@tripora.dev --password=Admin123 --role=ADMIN --firstName=Admin --lastName=Tripora

# Sửa tài khoản đã có (chỉ cập nhật flag nào được truyền)
npm run account:update -- --email=admin@tripora.dev --role=ADMIN
npm run account:update -- --email=user@tripora.dev --status=BANNED
npm run account:update -- --email=user@tripora.dev --password=NewPass123

# Xoá tài khoản (mặc định soft delete — đúng quy ước `deleted_at` toàn hệ thống)
npm run account:delete -- --email=user@tripora.dev
npm run account:delete -- --email=user@tripora.dev --hard   # xoá thật, không khôi phục được
```

Chi tiết flag từng script xem comment đầu file trong `scripts/create-account.ts`, `scripts/update-account.ts`, `scripts/delete-account.ts`.

## Cấu trúc thư mục
```
src/
  modules/     # mỗi domain 1 module (auth, user, destination, ...)
  common/      # decorator, guard dùng chung (roles, current-user...)
  database/    # PrismaService/DatabaseModule
  shared/      # utils dùng chung (pagination, slugify, parse-id...)
scripts/       # CLI script thao tác trực tiếp DB (tạo/sửa/xoá tài khoản...)
prisma/
  schema.prisma
postman/
  tripora-api.postman_collection.json
  tripora-api.postman_environment.json
```

## Scripts
- `npm run start:dev` — chạy dev (watch mode)
- `npm run build` — build production
- `npm run lint` — lint + auto-fix
- `npm run prisma:migrate` — tạo/áp dụng migration (dev)
- `npm run prisma:studio` — mở Prisma Studio
- `npm run account:create` / `account:update` / `account:delete` — xem mục Account Scripts ở trên
