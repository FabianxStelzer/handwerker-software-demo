-- AlterTable
ALTER TABLE "users" ADD COLUMN     "city" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "zip" TEXT;

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "street" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "taxId" TEXT,
    "vatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);
