# Backend Claude Instructions
> Version: 1.0 (Tripora - Booking Platform)

Tài liệu quy định toàn bộ tiêu chuẩn phát triển Backend của dự án **Tripora** (`backend/`). AI tuân thủ cả tài liệu `.claude/` (thứ tự ưu tiên: Business Rules -> Architecture -> backend/CLAUDE.md -> Coding Style -> Folder Structure -> API Contract -> Database).

## 1. TECH STACK & ARCHITECTURE LAYERS
- NestJS, TypeScript, Prisma ORM, **MySQL** (InnoDB), JWT (Access/Refresh), class-validator/class-transformer, Redis (Cache + Reservation Lock), BullMQ, Socket.IO, Cloudinary, SMTP (Mail), Swagger (API Docs).
- **Phân tầng bắt buộc (Dependency Rule)**: Controller -> Service -> Repository -> Prisma -> MySQL.
  - *Cấm*: Controller gọi thẳng Repository/Prisma/Redis; Guard/Interceptor gọi thẳng Repository/Prisma.
- **NestJS Modules**: Mỗi module quản lý 1 domain duy nhất (auth, user, partner, destination, property, room, room-availability, product, product-schedule, restaurant, vehicle, booking, payment, refund, commission, payout, review, wishlist, coupon, trip, itinerary, social, chat, notification, recommendation, activity, admin).

## 2. CHỨC NĂNG & GIỚI HẠN CỦA TỪNG LAYER
- **Controller (Cực mỏng)**: Chỉ nhận request, validate qua DTO, gọi Service, trả response, áp dụng Guard/Decorator/Interceptor. ❌ Cấm: logic nghiệp vụ, query DB, gọi Prisma/Repository, xử lý Transaction, gửi email/socket, upload file.
- **Service (Nơi chứa logic nghiệp vụ)**: Được phép gọi Repository, Redis, BullMQ, Cloudinary, gửi socket, chạy Transaction, check Business Rules. ❌ Cấm: Trả HTTP Response, đọc req/res trực tiếp.
- **Repository (Lớp duy nhất làm việc với Prisma)**: CRUD, query, phân trang, lọc, sắp xếp, aggregate. ❌ Cấm: logic nghiệp vụ, Auth/Permission.
- **⚠️ Chống Overbooking (MySQL/InnoDB)**: Trừ tồn kho (`room_availabilities.available`, `product_schedules.available`) BẮT BUỘC thực hiện trong 1 transaction dạng `UPDATE ... SET available = available - :qty WHERE id = :id AND available >= :qty`, sau đó kiểm tra `affectedRows`/kết quả update — nếu `0` thì rollback và trả lỗi hết chỗ. Cấm pattern `findFirst` rồi `update` riêng lẻ (race condition giữa 2 request đồng thời). Có thể bổ sung Redis Reservation Lock (`reservation:room:{roomId}:{date}`, TTL 900s) khi giữ chỗ chờ thanh toán.
- **⚠️ Booking Snapshot**: Khi tạo `BookingItem`, BẮT BUỘC copy `name`/`price` hiện tại của Room/Product vào chính record `BookingItem` (không chỉ lưu `resourceId`). Không bao giờ join sang Room/Product để lấy giá hiển thị cho Booking đã tạo.
- **⚠️ Payment Verify**: `Booking.status` chỉ được chuyển `CONFIRMED` từ Webhook Payment Gateway đã verify chữ ký/checksum — cấm nhận trực tiếp từ Frontend redirect callback.

## 3. CƠ CHẾ BỔ TRỢ & BẢO MẬT
- **Authentication**: JWT Access Token (sống ngắn) + Refresh Token (HTTP Only Cookie, thu hồi được, cấm trả trong body). Role: `TRAVELER`, `PARTNER`, `ADMIN`, `SUPER_ADMIN`.
- **Queue (BullMQ)**: Xử lý background job (email xác nhận booking, webhook retry, tính commission, cron job payout). Cấm chạy tác vụ nặng trực tiếp trong request.
- **Socket.IO (Realtime)**: Chỉ dùng cho Room/Product Availability update, Booking Status, Chat, Notification. Cấm dùng Socket cho nghiệp vụ ghi dữ liệu chính (phải qua REST API).
- **Cloudinary (Storage)**: Lưu ảnh Property/Room/Product/Avatar. DB chỉ lưu URL, Public ID. Cấm lưu file trên server.
- **Transaction**: Bắt buộc khi ghi/sửa trên nhiều bảng (Tạo Booking kèm BookingItem + trừ tồn kho + tạo Payment, Cancel Booking kèm hoàn tồn kho + tạo Refund). Cấm dùng cho GET.
- **Logging**: Chỉ ghi log Startup, Error, Warning, Audit. Cấm log password, token, OTP, cookie, secret, số thẻ thanh toán.

## 4. DEFINITION OF DONE (DOD)
Build OK; không lỗi TS; Prisma Schema hợp lệ (MySQL); Migration/Seed OK; API & DB đúng chuẩn `api-contract.md` & `database.md`; đúng Dependency Rule; cập nhật CHANGELOG.md, PROJECT_STATUS.md và `api-spec.md` nếu có đổi API.

## 5. POSTMAN COLLECTION (API TESTING)
- File: `postman/tripora-api.postman_collection.json` (+ `postman/tripora-api.postman_environment.json`). Collection chỉ chứa endpoint đã có trong `api-spec.md` — không tự thêm endpoint chưa được document.
- **Bắt buộc cập nhật đồng thời** với `api-spec.md` mỗi khi Thêm/Sửa/Xóa bất kỳ Endpoint nào: request mới/sửa/xóa tương ứng trong collection phải khớp field, method, status code theo `api-contract.md`/`api-spec.md`.
- Mỗi Request nhóm theo folder trùng tên Module (Auth, Property, Booking...). Có `description` ngắn gọn nêu mục đích + lưu ý (nếu phụ thuộc endpoint khác chưa có).
- Dùng biến collection (`{{baseUrl}}`, `{{accessToken}}`, `{{propertyId}}`...) — cấm hardcode giá trị thật/secret. Request nào trả về id cần dùng lại (login, create...) phải có Test script `pm.collectionVariables.set(...)` để tự chain sang request sau.
- **Checklist khi đổi Endpoint**: Sửa Controller -> Cập nhật `api-spec.md` -> Cập nhật Postman Collection (thêm/sửa/xóa request + biến liên quan) -> Test lại request bị ảnh hưởng.
