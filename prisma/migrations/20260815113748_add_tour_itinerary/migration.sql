-- CreateTable
CREATE TABLE `tour_itineraries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `tour_id` BIGINT NOT NULL,
    `day_number` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `activities` TEXT NULL,
    `meals` TEXT NULL,
    `locations` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `tour_itineraries_tour_id_idx`(`tour_id`),
    UNIQUE INDEX `tour_itineraries_tour_id_day_number_key`(`tour_id`, `day_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tour_itineraries` ADD CONSTRAINT `tour_itineraries_tour_id_fkey` FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
