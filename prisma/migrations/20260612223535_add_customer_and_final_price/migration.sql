-- AlterTable
ALTER TABLE `sale` ADD COLUMN `customerAddress` VARCHAR(191) NULL,
    ADD COLUMN `customerName` VARCHAR(191) NULL,
    ADD COLUMN `customerPhone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sale_item` ADD COLUMN `finalSellPrice` DECIMAL(15, 2) NULL;
