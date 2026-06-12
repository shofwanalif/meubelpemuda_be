/*
  Warnings:

  - You are about to drop the column `unit` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `product_price` table. All the data in the column will be lost.
  - Added the required column `branchId` to the `product` table without a default value. This is not possible if the table is not empty.
  - Made the column `totalSell` on table `sale_item` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `product_price` DROP FOREIGN KEY `product_price_branchId_fkey`;

-- DropIndex
DROP INDEX `product_price_branchId_fkey` ON `product_price`;

-- AlterTable
ALTER TABLE `branch` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `product` DROP COLUMN `unit`,
    ADD COLUMN `branchId` VARCHAR(191) NOT NULL,
    ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `stock` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `product_price` DROP COLUMN `branchId`;

-- AlterTable
ALTER TABLE `sale` ADD COLUMN `status` ENUM('COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED';

-- AlterTable
ALTER TABLE `sale_item` MODIFY `totalSell` DECIMAL(15, 2) NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `branchId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `category` ADD CONSTRAINT `category_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
