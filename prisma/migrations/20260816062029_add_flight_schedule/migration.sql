-- CreateTable
CREATE TABLE `flights` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `provider_id` BIGINT NOT NULL,
    `aircraft_id` BIGINT NOT NULL,
    `flight_number` VARCHAR(191) NOT NULL,
    `departure_airport_id` BIGINT NOT NULL,
    `arrival_airport_id` BIGINT NOT NULL,
    `duration` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `flights_provider_id_idx`(`provider_id`),
    INDEX `flights_aircraft_id_idx`(`aircraft_id`),
    INDEX `flights_departure_airport_id_idx`(`departure_airport_id`),
    INDEX `flights_arrival_airport_id_idx`(`arrival_airport_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flight_schedules` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `flight_id` BIGINT NOT NULL,
    `departure_date` DATE NOT NULL,
    `departure_time` VARCHAR(191) NOT NULL,
    `arrival_time` VARCHAR(191) NOT NULL,
    `economy_price` DECIMAL(10, 2) NOT NULL,
    `business_price` DECIMAL(10, 2) NULL,
    `status` ENUM('SCHEDULED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `flight_schedules_flight_id_idx`(`flight_id`),
    UNIQUE INDEX `flight_schedules_flight_id_departure_date_key`(`flight_id`, `departure_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `flights` ADD CONSTRAINT `flights_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flights` ADD CONSTRAINT `flights_aircraft_id_fkey` FOREIGN KEY (`aircraft_id`) REFERENCES `aircrafts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flights` ADD CONSTRAINT `flights_departure_airport_id_fkey` FOREIGN KEY (`departure_airport_id`) REFERENCES `airports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flights` ADD CONSTRAINT `flights_arrival_airport_id_fkey` FOREIGN KEY (`arrival_airport_id`) REFERENCES `airports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flight_schedules` ADD CONSTRAINT `flight_schedules_flight_id_fkey` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
