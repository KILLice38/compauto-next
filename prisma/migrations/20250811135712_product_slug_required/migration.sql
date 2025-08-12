/*
  Warnings:

  - Made the column `engineModel` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `autoMark` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `compressor` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `slug` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "engineModel" SET NOT NULL,
ALTER COLUMN "autoMark" SET NOT NULL,
ALTER COLUMN "compressor" SET NOT NULL,
ALTER COLUMN "slug" SET NOT NULL;
