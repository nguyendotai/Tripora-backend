# Modules

Mỗi domain là 1 module độc lập (xem `.claude/architecture.md` mục 2, `.claude/folder-structure.md` mục 3).

**Đã triển khai**: `auth/`, `user/`, `activity/` (ActivityLogService dùng chung, Global module), `destination/`, `property/` (CRUD, duyệt Admin, ownership Partner), `room/` (CRUD theo Property), `room-availability/` (CRUD + `decrementAvailability`/`incrementAvailability` chống Overbooking — dùng nội bộ, chưa có endpoint public, sẽ dùng bởi `booking/` sau này).

**Chưa triển khai** (thêm dần theo roadmap ở `PROJECT_STATUS.md`): `partner/` (hiện chỉ có lookup nội bộ qua Prisma trong `property.service.ts`/`room.service.ts`/`room-availability.service.ts`, chưa có API CRUD/duyệt Partner riêng), `product/`, `product-schedule/`, `restaurant/`, `vehicle/`, `booking/`, `payment/`, `refund/`, `commission/`, `payout/`, `review/`, `wishlist/`, `coupon/`, `trip/`, `itinerary/`, `social/`, `chat/`, `notification/`, `recommendation/`, `admin/`. Đặc tả business rule từng domain xem `.claude/specs/*.md`.
