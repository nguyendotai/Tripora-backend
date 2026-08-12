-- CreateTable
CREATE TABLE `trips` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `trips_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trip_days` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `trip_id` BIGINT NOT NULL,
    `day_number` INTEGER NOT NULL,
    `date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trip_days_trip_id_day_number_key`(`trip_id`, `day_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trip_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `trip_day_id` BIGINT NOT NULL,
    `destination_id` BIGINT NULL,
    `title` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `trip_items_trip_day_id_idx`(`trip_day_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trip_days` ADD CONSTRAINT `trip_days_trip_id_fkey` FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trip_items` ADD CONSTRAINT `trip_items_trip_day_id_fkey` FOREIGN KEY (`trip_day_id`) REFERENCES `trip_days`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trip_items` ADD CONSTRAINT `trip_items_destination_id_fkey` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
