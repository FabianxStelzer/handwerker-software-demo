"use client";

import { useState, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { ArrowLeft, Camera, FileText, Trash2 } from "lucide-react";
import { createMangelAction } from "./actions";
import { useActionState } from "react";

function MangelNeuForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const objektId = params.id as string;
  const elementId = params.elementId as string;
  const pruefungId = searchParams.get("pruefungId");

  const [beschreibung, setBeschreibung] = useState("");
  const [schwere, setSchwere] = useState("MITTEL");
  const [notizen, setNotizen] = useState("");
  const [fotoUrls, setFotoUrls] = useState<{ url: string; fileName: string }[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction] = useActionState(createMangelAction, null);

  if (!pruefungId) {
    return (
      <div className="space-y-4">
        <Link href={`/branchenspezifisch/schlosser/${objektId}/pruefung/${elementId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
        </Link>
        <Card className="p-12 text-center text-gray-500">
          Keine Prüfung angegeben. Bitte über die Prüfungsseite „Mangel hinzufügen“ wählen.
        </Card>
      </div>
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploadingFoto(true);
    try {
      const newUrls: { url: string; fileName: string }[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", "maengel");
        const res = await fetch("/api/schlosser/upload", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          newUrls.push({ url: data.url, fileName: data.fileName });
        }
      }
      setFotoUrls((prev) => [...prev, ...newUrls]);
    } catch {
      alert("Fehler beim Hochladen der Fotos.");
    } finally {
      setUploadingFoto(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Link href={`/branchenspezifisch/schlosser/${objektId}/pruefung/${elementId}`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zur Prüfung
        </Button>
      </Link>

      <Card className="p-6">
        <h1 className="text-xl font-semibold mb-4">Mangel hinzufügen</h1>
        {state?.error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
        )}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="pruefungId" value={pruefungId} />
          <input type="hidden" name="objektId" value={objektId} />
          <input type="hidden" name="elementId" value={elementId} />
          <input type="hidden" name="fotoUrls" value={JSON.stringify(fotoUrls)} />

          <div>
            <label className="text-sm font-medium text-gray-700">Beschreibung *</label>
            <Textarea
              name="beschreibung"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              rows={3}
              className="mt-1"
              placeholder="Was wurde festgestellt?"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Schweregrad</label>
            <NativeSelect
              name="schwere"
              className="mt-1 w-full"
              value={schwere}
              onChange={(e) => setSchwere(e.target.value)}
            >
              <option value="LEICHT">Leicht</option>
              <option value="MITTEL">Mittel</option>
              <option value="SCHWER">Schwer</option>
              <option value="KRITISCH">Kritisch</option>
            </NativeSelect>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Fotos & Dateien</label>
            <div className="mt-1 space-y-2">
              {fotoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {fotoUrls.map((f, i) => (
                    <div key={i} className="relative group">
                      {/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f.fileName) || f.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.url} alt={f.fileName} className="h-20 w-20 object-cover rounded-lg border" />
                          <button
                            type="button"
                            onClick={() => setFotoUrls((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-20 w-20 rounded-lg border bg-gray-100 flex items-center justify-center relative">
                          <FileText className="h-8 w-8 text-gray-400" />
                          <span className="absolute bottom-0 left-0 right-0 text-[10px] truncate px-1 bg-black/50 text-white rounded-b-lg">{f.fileName}</span>
                          <button
                            type="button"
                            onClick={() => setFotoUrls((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                disabled={uploadingFoto}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-5 w-5" />
                {uploadingFoto ? "Hochladen..." : fotoUrls.length > 0 ? "Weitere Fotos hinzufügen" : "Fotos aufnehmen oder Dateien wählen"}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notizen</label>
            <Textarea
              name="notizen"
              value={notizen}
              onChange={(e) => setNotizen(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href={`/branchenspezifisch/schlosser/${objektId}/pruefung/${elementId}`}>
              <Button type="button" variant="outline" size="sm">
                Abbrechen
              </Button>
            </Link>
            <Button type="submit" disabled={uploadingFoto}>
              {uploadingFoto ? "Hochladen läuft..." : "Mangel speichern"}
            </Button>
          </div>
        </form>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default function MangelNeuPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
      <MangelNeuForm />
    </Suspense>
  );
}
