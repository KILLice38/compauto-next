/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "slug" TEXT,
ALTER COLUMN "engineModel" DROP NOT NULL,
ALTER COLUMN "autoMark" DROP NOT NULL,
ALTER COLUMN "compressor" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
