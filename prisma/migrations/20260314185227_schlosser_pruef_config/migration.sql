-- CreateTable
CREATE TABLE "schlosser_pruef_config" (
    "id" TEXT NOT NULL,
    "elementTyp" "ElementTyp" NOT NULL,
    "intervallMonate" INTEGER NOT NULL DEFAULT 12,
    "pflicht" BOOLEAN NOT NULL DEFAULT true,
    "bezeichnung" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schlosser_pruef_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schlosser_pruef_config_elementTyp_key" ON "schlosser_pruef_config"("elementTyp");
