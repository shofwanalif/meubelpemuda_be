/*
  Warnings:

  - You are about to drop the column `finalSellPrice` on the `sale_item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `sale_item` DROP COLUMN `finalSellPrice`,
    ADD COLUMN `discountAmount` DECIMAL(15, 2) NULL DEFAULT 0;

