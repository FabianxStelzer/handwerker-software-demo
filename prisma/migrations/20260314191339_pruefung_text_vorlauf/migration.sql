-- AlterTable
ALTER TABLE "schlosser_pruef_config" ADD COLUMN     "vorlaufTage" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "schlosser_pruefung_texte" (
    "id" TEXT NOT NULL,
    "pruefungId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schlosser_pruefung_texte_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "schlosser_pruefung_texte" ADD CONSTRAINT "schlosser_pruefung_texte_pruefungId_fkey" FOREIGN KEY ("pruefungId") REFERENCES "schlosser_pruefungen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
