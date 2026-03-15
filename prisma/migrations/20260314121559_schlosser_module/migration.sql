-- CreateEnum
CREATE TYPE "ElementTyp" AS ENUM ('TUER', 'FENSTER', 'TOR', 'GELAENDER', 'ZAUN', 'SCHLOSS', 'FLUCHTWEG', 'BRANDSCHUTZTUER', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "PruefErgebnis" AS ENUM ('BESTANDEN', 'MAENGEL', 'NICHT_BESTANDEN');

-- CreateEnum
CREATE TYPE "MangelSchwere" AS ENUM ('LEICHT', 'MITTEL', 'SCHWER', 'KRITISCH');

-- CreateEnum
CREATE TYPE "ObjektStatus" AS ENUM ('OK', 'WARTUNG_FAELLIG', 'REPARATUR_NOETIG', 'PRUEFUNG_UEBERFAELLIG');

-- CreateTable
CREATE TABLE "schlosser_objekte" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "description" TEXT,
    "planFileName" TEXT,
    "planUrl" TEXT,
    "status" "ObjektStatus" NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schlosser_objekte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schlosser_elemente" (
    "id" TEXT NOT NULL,
    "objektId" TEXT NOT NULL,
    "typ" "ElementTyp" NOT NULL DEFAULT 'TUER',
    "bezeichnung" TEXT NOT NULL,
    "standort" TEXT,
    "hersteller" TEXT,
    "baujahr" INTEGER,
    "seriennummer" TEXT,
    "notizen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schlosser_elemente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schlosser_pruefungen" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pruefer" TEXT,
    "ergebnis" "PruefErgebnis" NOT NULL DEFAULT 'BESTANDEN',
    "notizen" TEXT,
    "naechstePruefung" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schlosser_pruefungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schlosser_maengel" (
    "id" TEXT NOT NULL,
    "pruefungId" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "schwere" "MangelSchwere" NOT NULL DEFAULT 'MITTEL',
    "fotoUrl" TEXT,
    "fotoName" TEXT,
    "behoben" BOOLEAN NOT NULL DEFAULT false,
    "behobenAm" TIMESTAMP(3),
    "notizen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schlosser_maengel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "schlosser_objekte" ADD CONSTRAINT "schlosser_objekte_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schlosser_elemente" ADD CONSTRAINT "schlosser_elemente_objektId_fkey" FOREIGN KEY ("objektId") REFERENCES "schlosser_objekte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schlosser_pruefungen" ADD CONSTRAINT "schlosser_pruefungen_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "schlosser_elemente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schlosser_maengel" ADD CONSTRAINT "schlosser_maengel_pruefungId_fkey" FOREIGN KEY ("pruefungId") REFERENCES "schlosser_pruefungen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
