-- CreateTable
CREATE TABLE `flight_bookings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `schedule_id` BIGINT NOT NULL,
    `flight_number` VARCHAR(191) NOT NULL,
    `departure_airport_code` VARCHAR(191) NOT NULL,
    `arrival_airport_code` VARCHAR(191) NOT NULL,
    `departure_date` DATE NOT NULL,
    `departure_time` VARCHAR(191) NOT NULL,
    `arrival_time` VARCHAR(191) NOT NULL,
    `number_of_passengers` INTEGER NOT NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `customer_email` VARCHAR(191) NULL,
    `customer_phone` VARCHAR(191) NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    `status` ENUM('CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `flight_bookings_user_id_idx`(`user_id`),
    INDEX `flight_bookings_schedule_id_idx`(`schedule_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `passengers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `flight_booking_id` BIGINT NOT NULL,
    `seat_id` BIGINT NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `id_number` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `passengers_flight_booking_id_idx`(`flight_booking_id`),
    INDEX `passengers_seat_id_idx`(`seat_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `flight_bookings` ADD CONSTRAINT `flight_bookings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flight_bookings` ADD CONSTRAINT `flight_bookings_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `flight_schedules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passengers` ADD CONSTRAINT `passengers_flight_booking_id_fkey` FOREIGN KEY (`flight_booking_id`) REFERENCES `flight_bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passengers` ADD CONSTRAINT `passengers_seat_id_fkey` FOREIGN KEY (`seat_id`) REFERENCES `flight_seats`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
