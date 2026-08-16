-- AlterTable
ALTER TABLE `payments` ADD COLUMN `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `coupons` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `discount_type` ENUM('PERCENT', 'FIXED') NOT NULL,
    `discount_value` DECIMAL(10, 2) NOT NULL,
    `max_discount_amount` DECIMAL(10, 2) NULL,
    `min_order_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `applicable_domains` JSON NULL,
    `usage_limit` INTEGER NULL,
    `used_count` INTEGER NOT NULL DEFAULT 0,
    `per_user_limit` INTEGER NULL,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_until` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupons_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupon_redemptions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `coupon_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `booking_domain` ENUM('HOTEL', 'TOUR', 'EXPERIENCE', 'TRANSPORT', 'FLIGHT') NOT NULL,
    `booking_id` BIGINT NOT NULL,
    `discount_amount` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `coupon_redemptions_coupon_id_idx`(`coupon_id`),
    INDEX `coupon_redemptions_user_id_idx`(`user_id`),
    UNIQUE INDEX `coupon_redemptions_booking_domain_booking_id_key`(`booking_domain`, `booking_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promotions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `discount_type` ENUM('PERCENT', 'FIXED') NOT NULL,
    `discount_value` DECIMAL(10, 2) NOT NULL,
    `max_discount_amount` DECIMAL(10, 2) NULL,
    `min_order_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `applicable_domains` JSON NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_until` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
