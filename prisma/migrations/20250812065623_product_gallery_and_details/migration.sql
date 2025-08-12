-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "details" TEXT[],
ADD COLUMN     "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[];
