-- AlterTable
ALTER TABLE `experience_bookings` MODIFY `status` ENUM('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE `flight_bookings` MODIFY `status` ENUM('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE `hotel_bookings` MODIFY `status` ENUM('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE `tour_bookings` MODIFY `status` ENUM('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE `transport_bookings` MODIFY `status` ENUM('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT';

-- CreateTable
CREATE TABLE `payments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `booking_domain` ENUM('HOTEL', 'TOUR', 'EXPERIENCE', 'TRANSPORT', 'FLIGHT') NOT NULL,
    `booking_id` BIGINT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    `provider` VARCHAR(191) NOT NULL DEFAULT 'stripe',
    `method` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `transaction_id` VARCHAR(191) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payments_user_id_idx`(`user_id`),
    INDEX `payments_booking_domain_booking_id_idx`(`booking_domain`, `booking_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `payment_id` BIGINT NOT NULL,
    `booking_domain` ENUM('HOTEL', 'TOUR', 'EXPERIENCE', 'TRANSPORT', 'FLIGHT') NOT NULL,
    `booking_id` BIGINT NOT NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `tax` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    `status` ENUM('ISSUED') NOT NULL DEFAULT 'ISSUED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invoices_payment_id_key`(`payment_id`),
    UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
    INDEX `invoices_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
