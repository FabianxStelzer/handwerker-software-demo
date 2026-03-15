"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function createMangelAction(
  _prevState: { error?: string } | null,
  formData: FormData
) {
  const pruefungId = formData.get("pruefungId") as string | null;
  const beschreibung = (formData.get("beschreibung") as string)?.trim();
  const schwereRaw = (formData.get("schwere") as string) || "MITTEL";
  const schwere = ["LEICHT", "MITTEL", "SCHWER", "KRITISCH"].includes(schwereRaw)
    ? schwereRaw
    : "MITTEL";
  const notizen = (formData.get("notizen") as string)?.trim() || null;
  const objektId = formData.get("objektId") as string;
  const elementId = formData.get("elementId") as string;

  if (!pruefungId || !beschreibung) {
    return { error: "Beschreibung ist erforderlich" };
  }

  let redirectUrl: string | null = null;
  try {
    let fotoUrls: { url: string; fileName: string }[] | null = null;
    const fotoUrlsStr = formData.get("fotoUrls") as string | null;
    if (fotoUrlsStr) {
      try {
        const parsed = JSON.parse(fotoUrlsStr);
        if (Array.isArray(parsed)) fotoUrls = parsed;
      } catch {
        /* ignore */
      }
    }

    const firstFoto = fotoUrls?.[0];
    await prisma.schlosserMangel.create({
      data: {
        pruefungId,
        beschreibung,
        schwere: schwere as "LEICHT" | "MITTEL" | "SCHWER" | "KRITISCH",
        fotoUrl: firstFoto?.url ?? null,
        fotoName: firstFoto?.fileName ?? null,
        fotoUrls: fotoUrls && fotoUrls.length > 0 ? fotoUrls : undefined,
        notizen,
      },
    });

    const pruefung = await prisma.schlosserPruefung.findUnique({ where: { id: pruefungId } });
    if (pruefung && pruefung.ergebnis === "BESTANDEN") {
      await prisma.schlosserPruefung.update({
        where: { id: pruefungId },
        data: { ergebnis: "MAENGEL" },
      });
    }

    redirectUrl = `/branchenspezifisch/schlosser/${objektId}/pruefung/${elementId}?expand=${pruefungId}`;
  } catch (err) {
    console.error("Mangel erstellen:", err);
    return { error: err instanceof Error ? err.message : "Fehler beim Speichern" };
  }

  redirect(redirectUrl!);
}
