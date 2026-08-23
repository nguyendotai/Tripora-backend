-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `experience_id` BIGINT NULL,
    ADD COLUMN `flight_id` BIGINT NULL,
    ADD COLUMN `tour_id` BIGINT NULL;

-- CreateIndex
CREATE INDEX `reviews_tour_id_idx` ON `reviews`(`tour_id`);

-- CreateIndex
CREATE INDEX `reviews_experience_id_idx` ON `reviews`(`experience_id`);

-- CreateIndex
CREATE INDEX `reviews_flight_id_idx` ON `reviews`(`flight_id`);

-- CreateIndex
CREATE UNIQUE INDEX `reviews_user_id_tour_id_key` ON `reviews`(`user_id`, `tour_id`);

-- CreateIndex
CREATE UNIQUE INDEX `reviews_user_id_experience_id_key` ON `reviews`(`user_id`, `experience_id`);

-- CreateIndex
CREATE UNIQUE INDEX `reviews_user_id_flight_id_key` ON `reviews`(`user_id`, `flight_id`);

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_tour_id_fkey` FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_experience_id_fkey` FOREIGN KEY (`experience_id`) REFERENCES `experiences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_flight_id_fkey` FOREIGN KEY (`flight_id`) REFERENCES `flights`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
