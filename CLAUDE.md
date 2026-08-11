# Backend Claude Instructions
> Tripora — NestJS Backend. Roadmap theo phase: xem `../phases/README.md` (V1 → V9).

Tài liệu quy định tiêu chuẩn phát triển `backend/`. AI tuân thủ `.claude/` gốc trước (business-rules, architecture, coding-style, naming, folder-structure, database), tài liệu này bổ sung riêng cho Backend. Chỉ code tính năng thuộc phase đang làm (xem checklist "Backend" trong file phase tương ứng ở `../phases/`) — không code trước tính năng của phase sau khi phase hiện tại chưa đạt Definition of Done.

## 1. Tech Stack & Kiến trúc
- NestJS, TypeScript, Prisma ORM, **MySQL** (InnoDB), JWT (Access/Refresh), class-validator/class-transformer, Swagger (API Docs).
- **Redis, BullMQ, Socket.IO, Cloudinary, SMTP chỉ cài khi tới phase thực sự cần** (Cloudinary khi implement upload ảnh, Redis/BullMQ/Socket.IO ở V9 — Realtime/Queue, SMTP khi cần gửi email thật) — không cài trước cho "sau này dùng".
- **Phân tầng bắt buộc**: Controller -> Service -> Repository -> Prisma -> MySQL.
  - *Cấm*: Controller/Guard/Interceptor gọi thẳng Repository/Prisma/Redis.
- **NestJS Modules**: mỗi module quản lý đúng 1 domain. Danh sách module mở rộng dần theo phase — không tạo module cho domain của phase chưa tới lượt (xem checklist Backend ở từng file `../phases/v*.md`).

## 2. Chức năng & giới hạn từng layer
- **Controller (mỏng)**: nhận request, validate qua DTO, gọi Service, trả response, áp dụng Guard/Decorator/Interceptor. ❌ Cấm: business logic, query DB, gọi Prisma/Repository trực tiếp, xử lý transaction.
- **Service (chứa business logic)**: gọi Repository, chạy Transaction, check Business Rule, gọi side-effect (email/queue/socket khi đã wiring). ❌ Cấm: trả HTTP response, đọc req/res trực tiếp.
- **Repository (lớp duy nhất làm việc với Prisma)**: CRUD, query, phân trang, lọc, sắp xếp, aggregate. ❌ Cấm: business logic, Auth/Permission.

## 3. Quy tắc áp dụng khi tới phase có Booking/Inventory/Payment (V2 trở đi)
Ghi lại trước để nhất quán khi implement — chưa áp dụng ở V1 (V1 chưa có Booking):
- **Chống Overbooking**: trừ tồn kho bắt buộc trong 1 transaction dạng `UPDATE ... SET available = available - :qty WHERE ... AND available >= :qty`, kiểm tra affected rows — `0` thì rollback + trả lỗi hết chỗ. Cấm pattern `findFirst` rồi `update` riêng lẻ (race condition).
- **Booking Snapshot**: tạo BookingItem phải copy `name`/`price` hiện tại vào chính record — không bao giờ join ngược lấy giá hiển thị cho Booking đã tạo.
- **Payment Verify**: trạng thái thanh toán chỉ chuyển CONFIRMED từ Webhook Gateway đã verify chữ ký/checksum — cấm nhận trực tiếp từ Frontend redirect.

## 4. Auth & Role
- V1: JWT Access Token (sống ngắn) + Refresh Token (HTTP-Only Cookie, thu hồi được). Role tối thiểu `USER`/`ADMIN`.
- Role mở rộng dần theo phase: Provider/Organization roles (Owner/Manager/Booking Staff/Finance Staff/Guide) chỉ thêm khi tới V7 (xem `../phases/v7-provider-marketplace.md`) — không tạo bảng `roles`/`permissions` chi tiết trước khi cần.

## 5. Cơ chế bổ trợ & bảo mật
- **Transaction**: bắt buộc khi ghi/sửa nhiều bảng liên quan trong 1 nghiệp vụ. Cấm dùng cho GET.
- **Queue/Realtime (BullMQ/Socket.IO)**: chỉ thêm ở V9 — trước đó xử lý đồng bộ hoặc cron đơn giản (`@nestjs/schedule`) là đủ, không over-engineer sớm.
- **Logging**: chỉ ghi Startup, Error, Warning, Audit. Cấm log password, token, OTP, cookie, secret.

## 6. Definition of Done (DOD)
Build OK; không lỗi TS; Prisma Schema hợp lệ (MySQL); Migration/Seed OK; API & DB đúng `api-contract.md`/`database.md`; đúng Dependency Rule; cập nhật `CHANGELOG.md`, `PROJECT_STATUS.md`, và % trong file phase tương ứng ở `../phases/`; cập nhật `../.claude/api-spec.md` nếu có đổi API.

## 7. Postman Collection (API Testing)
- File: `postman/tripora-api.postman_collection.json` + `postman/tripora-api.postman_environment.json`. Collection chỉ chứa endpoint đã có trong `api-spec.md` — không tự thêm endpoint chưa document.
- Mỗi Request nhóm theo folder trùng tên Module. Dùng biến collection (`{{baseUrl}}`, `{{accessToken}}`...) — cấm hardcode giá trị thật/secret. Request trả id cần dùng lại phải có Test script tự chain sang request sau.
- **Checklist khi đổi Endpoint**: Sửa Controller -> Cập nhật `api-spec.md` -> Cập nhật Postman Collection -> Test lại request bị ảnh hưởng.
