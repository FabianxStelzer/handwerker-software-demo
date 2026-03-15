import { prisma } from "@/lib/prisma";

type ObjektStatusType = "OK" | "WARTUNG_FAELLIG" | "REPARATUR_NOETIG" | "NACHPRUEFUNG_OFFEN" | "PRUEFUNG_UEBERFAELLIG";

export async function updateObjektStatus(objektId: string) {
  const elemente = await prisma.schlosserElement.findMany({
    where: { objektId },
    include: {
      pruefungen: {
        orderBy: { datum: "desc" },
        take: 1,
        include: { maengel: true },
      },
    },
  });

  let status: ObjektStatusType = "OK";
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  for (const el of elemente) {
    const letztePruefung = el.pruefungen[0];
    if (!letztePruefung || letztePruefung.datum < oneYearAgo) {
      status = "PRUEFUNG_UEBERFAELLIG";
      break;
    }
    const offeneMaengel = letztePruefung.maengel.filter((m) => !m.behoben);
    const behobeneMaengel = letztePruefung.maengel.filter((m) => m.behoben);

    if (offeneMaengel.length > 0) {
      if (letztePruefung.ergebnis === "NICHT_BESTANDEN") {
        status = "REPARATUR_NOETIG";
      } else if (letztePruefung.ergebnis === "MAENGEL" && status === "OK") {
        status = "WARTUNG_FAELLIG";
      }
    } else if (behobeneMaengel.length > 0) {
      // Alle Mängel behoben – prüfen ob zugehörige Aufgabe Erledigt oder Abgenommen
      // ERLEDIGT → Nachprüfung offen, ABGENOMMEN → Alles OK
      if (status === "OK" || status === "WARTUNG_FAELLIG") {
        const behobeneMangelIds = behobeneMaengel.map((m) => m.id);
        const aufgaben = await prisma.schlosserAufgabe.findMany({
          where: { mangelId: { in: behobeneMangelIds } },
          select: { status: true },
        });
        const hatErledigt = aufgaben.some((a) => a.status === "ERLEDIGT");
        const alleAbgenommen = aufgaben.length > 0 && aufgaben.every((a) => a.status === "ABGENOMMEN");
        if (hatErledigt) {
          status = "NACHPRUEFUNG_OFFEN";
        } else if (alleAbgenommen) {
          status = "OK";
        } else {
          // Keine Aufgabe oder nicht alle abgenommen → Nachprüfung offen
          status = "NACHPRUEFUNG_OFFEN";
        }
      }
    } else if (letztePruefung.ergebnis === "NICHT_BESTANDEN") {
      status = "REPARATUR_NOETIG";
    } else if (letztePruefung.ergebnis === "MAENGEL" && status === "OK") {
      status = "WARTUNG_FAELLIG";
    }
  }

  await prisma.schlosserObjekt.update({
    where: { id: objektId },
    data: { status },
  });
  return status;
}
