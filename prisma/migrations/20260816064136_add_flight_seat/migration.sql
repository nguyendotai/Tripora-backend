-- CreateTable
CREATE TABLE `flight_seats` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schedule_id` BIGINT NOT NULL,
    `seat_number` VARCHAR(191) NOT NULL,
    `class` ENUM('ECONOMY', 'BUSINESS') NOT NULL,
    `status` ENUM('AVAILABLE', 'BOOKED') NOT NULL DEFAULT 'AVAILABLE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `flight_seats_schedule_id_idx`(`schedule_id`),
    UNIQUE INDEX `flight_seats_schedule_id_seat_number_key`(`schedule_id`, `seat_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `flight_seats` ADD CONSTRAINT `flight_seats_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `flight_schedules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
