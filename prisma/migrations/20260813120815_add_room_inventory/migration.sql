-- CreateTable
CREATE TABLE `room_inventory` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `room_id` BIGINT NOT NULL,
    `date` DATE NOT NULL,
    `total_rooms` INTEGER NOT NULL,
    `available_rooms` INTEGER NOT NULL,
    `booked_rooms` INTEGER NOT NULL DEFAULT 0,
    `price` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `room_inventory_room_id_idx`(`room_id`),
    UNIQUE INDEX `room_inventory_room_id_date_key`(`room_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `room_inventory` ADD CONSTRAINT `room_inventory_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `property_rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
