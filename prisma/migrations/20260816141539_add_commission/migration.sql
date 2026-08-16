-- AlterTable
ALTER TABLE `providers` ADD COLUMN `commission_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.1;

-- CreateTable
CREATE TABLE `commissions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `provider_id` BIGINT NOT NULL,
    `payment_id` BIGINT NOT NULL,
    `booking_domain` ENUM('HOTEL', 'TOUR', 'EXPERIENCE', 'TRANSPORT', 'FLIGHT') NOT NULL,
    `booking_id` BIGINT NOT NULL,
    `gross_amount` DECIMAL(10, 2) NOT NULL,
    `rate` DECIMAL(5, 4) NOT NULL,
    `platform_amount` DECIMAL(10, 2) NOT NULL,
    `provider_amount` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `commissions_payment_id_key`(`payment_id`),
    INDEX `commissions_provider_id_idx`(`provider_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
