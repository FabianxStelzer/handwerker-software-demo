-- CreateTable
CREATE TABLE "schlosser_objekt_bilder" (
    "id" TEXT NOT NULL,
    "objektId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "beschreibung" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schlosser_objekt_bilder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schlosser_element_bilder" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "beschreibung" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schlosser_element_bilder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "schlosser_objekt_bilder" ADD CONSTRAINT "schlosser_objekt_bilder_objektId_fkey" FOREIGN KEY ("objektId") REFERENCES "schlosser_objekte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schlosser_element_bilder" ADD CONSTRAINT "schlosser_element_bilder_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "schlosser_elemente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
