# Config

Cấu hình theo domain (jwt, redis, mail, cloudinary, cors, payment-gateway — xem `.claude/folder-structure.md` mục 3). Hiện dùng trực tiếp `@nestjs/config` + `.env` qua `ConfigService`; tách file cấu hình riêng khi logic đọc `.env` phức tạp hơn (ví dụ cần validate schema bằng Joi/Zod).
