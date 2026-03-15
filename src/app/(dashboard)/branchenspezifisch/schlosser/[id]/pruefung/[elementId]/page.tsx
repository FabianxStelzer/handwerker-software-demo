import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import PruefungClient from "../PruefungClient";

export const dynamic = "force-dynamic";

export default async function PruefungElementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; elementId: string }>;
  searchParams: Promise<{ expand?: string }>;
}) {
  const { id: objektId, elementId } = await params;
  const { expand } = await searchParams;
  const session = await auth();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  let element: { id: string; typ: string; bezeichnung: string; standort: string | null; hersteller: string | null; baujahr: number | null } | null = null;
  let pruefungen: Array<{
    id: string;
    datum: Date;
    pruefer: string | null;
    ergebnis: string;
    notizen: string | null;
    naechstePruefung: Date | null;
    maengel: Array<{ id: string; beschreibung: string; schwere: string; fotoUrl: string | null; fotoName: string | null; fotoUrls?: unknown; behoben: boolean; behobenAm: Date | null; notizen: string | null; pruefungId?: string; createdAt: Date; aufgabeId?: string | null }>;
    texteintraege?: Array<{ id: string; text: string; createdAt: Date }>;
  }> = [];

  try {
    const [el, pr] = await Promise.all([
      prisma.schlosserElement.findFirst({
        where: { id: elementId, objektId },
        select: { id: true, typ: true, bezeichnung: true, standort: true, hersteller: true, baujahr: true },
      }),
      prisma.schlosserPruefung.findMany({
        where: { elementId },
        include: { maengel: true },
        orderBy: { datum: "desc" },
      }),
    ]);
    const mangelIds = pr.flatMap((p) => p.maengel.map((m) => m.id));
    const aufgabenList = mangelIds.length > 0
      ? await prisma.schlosserAufgabe.findMany({
          where: { mangelId: { in: mangelIds } },
          select: { mangelId: true, id: true },
        })
      : [];
    const aufgabeByMangel = new Map(aufgabenList.map((a) => [a.mangelId, a.id]));
    element = el;
    pruefungen = pr.map((p) => ({
      id: p.id,
      datum: p.datum,
      pruefer: p.pruefer,
      ergebnis: p.ergebnis,
      notizen: p.notizen,
      naechstePruefung: p.naechstePruefung,
      maengel: p.maengel.map((m) => ({
        id: m.id,
        beschreibung: m.beschreibung,
        schwere: m.schwere,
        fotoUrl: m.fotoUrl,
        fotoName: m.fotoName,
        fotoUrls: m.fotoUrls,
        behoben: m.behoben,
        behobenAm: m.behobenAm,
        behobenVon: m.behobenVon,
        behobenNotiz: m.behobenNotiz,
        notizen: m.notizen,
        pruefungId: m.pruefungId,
        createdAt: m.createdAt,
        aufgabeId: aufgabeByMangel.get(m.id) ?? null,
      })),
      texteintraege: [],
    }));
  } catch (err) {
    console.error("Pruefung Page Daten laden:", err);
  }

  const initialData = {
    element: element ? { ...element, baujahr: element.baujahr } : null,
    pruefungen: pruefungen.map((p) => ({
      ...p,
      datum: p.datum.toISOString(),
      naechstePruefung: p.naechstePruefung?.toISOString() ?? null,
      maengel: p.maengel.map((m) => ({
        ...m,
        behobenAm: m.behobenAm?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      texteintraege: (p.texteintraege ?? []).map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      })),
    })),
  };

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <PruefungClient
        objektId={objektId}
        elementId={elementId}
        initialElement={initialData.element}
        initialPruefungen={initialData.pruefungen}
        isAdmin={isAdmin}
        expandPruefungId={expand ?? undefined}
      />
    </Suspense>
  );
}
