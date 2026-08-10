# Modules

Mỗi domain là 1 module độc lập (xem `.claude/architecture.md` mục 2, `.claude/folder-structure.md` mục 3).

**Đã triển khai**: `auth/`, `user/`, `activity/` (ActivityLogService dùng chung, Global module), `destination/`.

**Chưa triển khai** (thêm dần theo roadmap ở `PROJECT_STATUS.md`): `partner/`, `property/`, `room/`, `room-availability/`, `product/`, `product-schedule/`, `restaurant/`, `vehicle/`, `booking/`, `payment/`, `refund/`, `commission/`, `payout/`, `review/`, `wishlist/`, `coupon/`, `trip/`, `itinerary/`, `social/`, `chat/`, `notification/`, `recommendation/`, `admin/`. Đặc tả business rule từng domain xem `.claude/specs/*.md`.
