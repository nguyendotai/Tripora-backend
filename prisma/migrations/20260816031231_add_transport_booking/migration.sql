-- CreateTable
CREATE TABLE `transport_bookings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `route_id` BIGINT NOT NULL,
    `vehicle_id` BIGINT NOT NULL,
    `route_origin` VARCHAR(191) NOT NULL,
    `route_destination` VARCHAR(191) NOT NULL,
    `vehicle_name` VARCHAR(191) NOT NULL,
    `departure_date` DATE NOT NULL,
    `number_of_people` INTEGER NOT NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `customer_email` VARCHAR(191) NULL,
    `customer_phone` VARCHAR(191) NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    `status` ENUM('CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `transport_bookings_user_id_idx`(`user_id`),
    INDEX `transport_bookings_route_id_idx`(`route_id`),
    INDEX `transport_bookings_vehicle_id_idx`(`vehicle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transport_bookings` ADD CONSTRAINT `transport_bookings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_bookings` ADD CONSTRAINT `transport_bookings_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `transport_routes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_bookings` ADD CONSTRAINT `transport_bookings_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
