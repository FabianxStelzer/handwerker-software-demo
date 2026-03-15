-- CreateEnum
CREATE TYPE "AufgabeTyp" AS ENUM ('REPARATUR', 'PRUEFUNG', 'WARTUNG', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "AufgabePrioritaet" AS ENUM ('NIEDRIG', 'NORMAL', 'HOCH', 'DRINGEND');

-- CreateEnum
CREATE TYPE "AufgabeStatus" AS ENUM ('OFFEN', 'IN_ARBEIT', 'WARTE_AUF_MATERIAL', 'ERLEDIGT', 'ABGENOMMEN');

-- CreateTable
CREATE TABLE "schlosser_aufgaben" (
    "id" TEXT NOT NULL,
    "objektId" TEXT NOT NULL,
    "elementId" TEXT,
    "mangelId" TEXT,
    "typ" "AufgabeTyp" NOT NULL DEFAULT 'REPARATUR',
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "prioritaet" "AufgabePrioritaet" NOT NULL DEFAULT 'NORMAL',
    "status" "AufgabeStatus" NOT NULL DEFAULT 'OFFEN',
    "zugewiesenAn" TEXT,
    "erstelltVon" TEXT NOT NULL,
    "faelligAm" TIMESTAMP(3),
    "erledigtAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schlosser_aufgaben_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schlosser_aufgabe_kommentare" (
    "id" TEXT NOT NULL,
    "aufgabeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "fotoName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schlosser_aufgabe_kommentare_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "schlosser_aufgaben" ADD CONSTRAINT "schlosser_aufgaben_objektId_fkey" FOREIGN KEY ("objektId") REFERENCES "schlosser_objekte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schlosser_aufgaben" ADD CONSTRAINT "schlosser_aufgaben_zugewiesenAn_fkey" FOREIGN KEY ("zugewiesenAn") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schlosser_aufgaben" ADD CONSTRAINT "schlosser_aufgaben_erstelltVon_fkey" FOREIGN KEY ("erstelltVon") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schlosser_aufgabe_kommentare" ADD CONSTRAINT "schlosser_aufgabe_kommentare_aufgabeId_fkey" FOREIGN KEY ("aufgabeId") REFERENCES "schlosser_aufgaben"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schlosser_aufgabe_kommentare" ADD CONSTRAINT "schlosser_aufgabe_kommentare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
