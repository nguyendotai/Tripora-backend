# Modules

Mỗi domain là 1 module độc lập (xem `.claude/architecture.md` mục 2, `.claude/folder-structure.md` mục 3).

**Đã triển khai**: `auth/`, `user/`, `activity/` (ActivityLogService dùng chung, Global module), `destination/`, `property/` (CRUD, duyệt Admin, ownership Partner), `room/` (CRUD theo Property), `room-availability/` (CRUD + `decrementAvailability`/`incrementAvailability` chống Overbooking — dùng nội bộ, chưa có endpoint public, dùng bởi `booking/`), `booking/` (tạo/hủy Booking Hotel, transaction trừ/hoàn tồn kho + snapshot giá), `payment/` (Webhook Gateway giả lập, xem ghi chú dưới), `refund/` (xác nhận hoàn tiền giả lập, tạo tự động qua `booking/` khi hủy Booking đã thanh toán).

**Payment/Refund là placeholder**: chưa tích hợp Payment Gateway thật (VNPAY/Momo/Stripe) — `POST /payments/webhook` và `PATCH /refunds/:id/complete` mô phỏng callback Gateway bằng chữ ký HMAC-SHA256 tự ký (`PAYMENT_WEBHOOK_SECRET`), dùng để test luồng CONFIRMED/CANCELLED/REFUNDED trọn vẹn cho tới khi có Gateway thật.

**Chưa triển khai** (thêm dần theo roadmap ở `PROJECT_STATUS.md`): `partner/` (hiện chỉ có lookup nội bộ qua Prisma trong `property.service.ts`/`room.service.ts`/`room-availability.service.ts`/`booking.service.ts`, chưa có API CRUD/duyệt Partner riêng), `product/`, `product-schedule/`, `restaurant/`, `vehicle/`, `commission/`, `payout/`, `review/`, `wishlist/`, `coupon/`, `trip/`, `itinerary/`, `social/`, `chat/`, `notification/` (model có, chỉ tạo nội bộ từ `booking/`/`payment/`/`refund/`, chưa có API đọc/đánh dấu đã đọc), `recommendation/`, `admin/`. Đặc tả business rule từng domain xem `.claude/specs/*.md`.
