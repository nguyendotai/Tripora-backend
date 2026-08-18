-- AlterTable
ALTER TABLE `reviews` MODIFY `destination_id` BIGINT NULL,
    ADD COLUMN `property_id` BIGINT NULL;

-- CreateIndex
CREATE INDEX `reviews_property_id_idx` ON `reviews`(`property_id`);

-- CreateIndex
CREATE UNIQUE INDEX `reviews_user_id_property_id_key` ON `reviews`(`user_id`, `property_id`);

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_property_id_fkey` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
