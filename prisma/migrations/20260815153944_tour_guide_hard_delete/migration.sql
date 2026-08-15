-- TourGuide chuyen sang hard delete (cung ly do da doi voi TourItinerary): unique(user_id)
-- cua MySQL van tinh ca ban ghi soft-delete, khien xoa-roi-them-lai cung email bi loi.
-- Xoa that cac ban ghi da soft-delete truoc — neu khong, chung se "song lai" sau khi bo cot deleted_at.
DELETE FROM `tour_guides` WHERE `deleted_at` IS NOT NULL;
ALTER TABLE `tour_guides` DROP COLUMN `deleted_at`;
