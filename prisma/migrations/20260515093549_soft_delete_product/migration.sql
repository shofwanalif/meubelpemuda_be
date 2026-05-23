-- DropForeignKey
ALTER TABLE `product_price` DROP FOREIGN KEY `product_price_productId_fkey`;

-- DropIndex
DROP INDEX `product_price_productId_fkey` ON `product_price`;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `product_price` ADD CONSTRAINT `product_price_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
