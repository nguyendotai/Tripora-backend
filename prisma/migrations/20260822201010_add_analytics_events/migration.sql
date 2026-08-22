-- CreateTable
CREATE TABLE `analytics_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `type` ENUM('SEARCH', 'VIEW') NOT NULL,
    `user_id` BIGINT NULL,
    `entity_type` VARCHAR(191) NULL,
    `entity_id` BIGINT NULL,
    `query` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `analytics_events_type_created_at_idx`(`type`, `created_at`),
    INDEX `analytics_events_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

