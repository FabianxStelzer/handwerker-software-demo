-- CreateTable
CREATE TABLE "schlosser_objekt_plaene" (
    "id" TEXT NOT NULL,
    "objektId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "titel" TEXT,
    "beschreibung" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schlosser_objekt_plaene_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "schlosser_objekt_plaene" ADD CONSTRAINT "schlosser_objekt_plaene_objektId_fkey" FOREIGN KEY ("objektId") REFERENCES "schlosser_objekte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
