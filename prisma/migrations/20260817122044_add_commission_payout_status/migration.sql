-- AlterTable
ALTER TABLE `commissions` ADD COLUMN `paid_at` DATETIME(3) NULL,
    ADD COLUMN `payout_status` ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING';
