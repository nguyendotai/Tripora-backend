-- AlterTable
ALTER TABLE `tour_schedules` ADD COLUMN `guide_id` BIGINT NULL;

-- CreateTable
CREATE TABLE `tour_guides` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `provider_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `bio` TEXT NULL,
    `phone` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `tour_guides_user_id_key`(`user_id`),
    INDEX `tour_guides_provider_id_idx`(`provider_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `tour_schedules_guide_id_idx` ON `tour_schedules`(`guide_id`);

-- AddForeignKey
ALTER TABLE `tour_schedules` ADD CONSTRAINT `tour_schedules_guide_id_fkey` FOREIGN KEY (`guide_id`) REFERENCES `tour_guides`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tour_guides` ADD CONSTRAINT `tour_guides_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tour_guides` ADD CONSTRAINT `tour_guides_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
