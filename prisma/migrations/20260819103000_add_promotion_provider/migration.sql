-- AlterTable
ALTER TABLE `promotions` ADD COLUMN `provider_id` BIGINT NULL;

-- CreateIndex
CREATE INDEX `promotions_provider_id_idx` ON `promotions`(`provider_id`);

-- AddForeignKey
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
