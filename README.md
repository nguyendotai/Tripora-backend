# Tripora Backend

REST API cho Tripora (Booking/Travel Platform) — NestJS + Prisma + MySQL.

## Tech Stack
NestJS, TypeScript, Prisma ORM, MySQL (InnoDB), JWT (Access/Refresh), Redis (Cache + Reservation Lock), BullMQ (Queue), Socket.IO (Realtime), Cloudinary (Storage), SMTP (Email), Swagger (API Docs).

Xem quy tắc phát triển đầy đủ tại `CLAUDE.md` và `../.claude/*.md` (`business-rules.md`, `architecture.md`, `folder-structure.md`, `database.md`, `api-contract.md`, `api-spec.md`, `specs/*.md`).

## Getting Started

```bash
npm install
cp .env.example .env   # chỉnh DATABASE_URL, JWT secret, Redis, Cloudinary, SMTP
npm run prisma:generate
npm run prisma:migrate   # cần MySQL đang chạy, khớp DATABASE_URL
npm run start:dev
```

API mặc định chạy tại `http://localhost:5550/api/v1`, Swagger docs tại `http://localhost:5550/docs`.

## Cấu trúc thư mục
```
src/
  modules/     # mỗi domain 1 module (auth, user, ...) — xem src/modules/README.md
  common/      # decorator, guard, filter, interceptor dùng chung
  database/    # PrismaService/DatabaseModule
  config/      # cấu hình theo domain
  shared/      # helper/util/constant/type dùng chung
prisma/
  schema.prisma
```

## Scripts
- `npm run start:dev` — chạy dev (watch mode)
- `npm run build` — build production
- `npm run lint` — lint + auto-fix
- `npm run prisma:migrate` — tạo/áp dụng migration (dev)
- `npm run prisma:studio` — mở Prisma Studio
