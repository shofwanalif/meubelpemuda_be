/*
  Warnings:

  - You are about to alter the column `stock` on the `product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Int`.
  - You are about to alter the column `qty` on the `sale_item` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Int`.

*/
-- AlterTable
ALTER TABLE `product` MODIFY `stock` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `sale_item` MODIFY `qty` INTEGER NOT NULL;
