-- CreateTable
CREATE TABLE "FilterOption" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilterOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FilterOption_type_idx" ON "FilterOption"("type");

-- CreateIndex
CREATE UNIQUE INDEX "FilterOption_type_value_key" ON "FilterOption"("type", "value");
