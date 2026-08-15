-- CreateTable
CREATE TABLE `tour_schedules` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tour_id` BIGINT NOT NULL,
    `departure_date` DATE NOT NULL,
    `capacity` INTEGER NOT NULL,
    `available` INTEGER NOT NULL,
    `booked` INTEGER NOT NULL DEFAULT 0,
    `price` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tour_schedules_tour_id_idx`(`tour_id`),
    UNIQUE INDEX `tour_schedules_tour_id_departure_date_key`(`tour_id`, `departure_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tour_schedules` ADD CONSTRAINT `tour_schedules_tour_id_fkey` FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
