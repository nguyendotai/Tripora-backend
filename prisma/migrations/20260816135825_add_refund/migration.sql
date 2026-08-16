-- AlterTable
ALTER TABLE `payments` ADD COLUMN `payment_intent_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `refunds` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `payment_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `booking_domain` ENUM('HOTEL', 'TOUR', 'EXPERIENCE', 'TRANSPORT', 'FLIGHT') NOT NULL,
    `booking_id` BIGINT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `percent` INTEGER NOT NULL,
    `reason` TEXT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `stripe_refund_id` VARCHAR(191) NULL,
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refunds_payment_id_key`(`payment_id`),
    INDEX `refunds_user_id_idx`(`user_id`),
    INDEX `refunds_booking_domain_booking_id_idx`(`booking_domain`, `booking_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
