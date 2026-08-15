-- CreateTable
CREATE TABLE `experiences` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `provider_id` BIGINT NOT NULL,
    `destination_id` BIGINT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `images` JSON NULL,
    `duration_label` VARCHAR(191) NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'VND',
    `max_participants` INTEGER NULL,
    `included` TEXT NULL,
    `excluded` TEXT NULL,
    `cancellation_policy` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `experiences_slug_key`(`slug`),
    INDEX `experiences_provider_id_idx`(`provider_id`),
    INDEX `experiences_destination_id_idx`(`destination_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `experience_schedules` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `experience_id` BIGINT NOT NULL,
    `departure_date` DATE NOT NULL,
    `capacity` INTEGER NOT NULL,
    `available` INTEGER NOT NULL,
    `booked` INTEGER NOT NULL DEFAULT 0,
    `price` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `experience_schedules_experience_id_idx`(`experience_id`),
    UNIQUE INDEX `experience_schedules_experience_id_departure_date_key`(`experience_id`, `departure_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `experience_bookings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `experience_id` BIGINT NOT NULL,
    `experience_title` VARCHAR(191) NOT NULL,
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

    INDEX `experience_bookings_user_id_idx`(`user_id`),
    INDEX `experience_bookings_experience_id_idx`(`experience_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `experiences` ADD CONSTRAINT `experiences_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experiences` ADD CONSTRAINT `experiences_destination_id_fkey` FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experience_schedules` ADD CONSTRAINT `experience_schedules_experience_id_fkey` FOREIGN KEY (`experience_id`) REFERENCES `experiences`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experience_bookings` ADD CONSTRAINT `experience_bookings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experience_bookings` ADD CONSTRAINT `experience_bookings_experience_id_fkey` FOREIGN KEY (`experience_id`) REFERENCES `experiences`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
