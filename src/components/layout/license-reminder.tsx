"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Shield, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LicenseReminder() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [show, setShow] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dismissed = useRef(false);

  useEffect(() => {
    if (!userId || dismissed.current) return;
    async function check() {
      try {
        const [vRes, lRes] = await Promise.all([
          fetch("/api/fahrzeuge"),
          fetch("/api/fuehrerschein"),
        ]);
        if (!vRes.ok || !lRes.ok) return;
        const vehicles = await vRes.json();
        const licenses = await lRes.json();

        const isAssigned = vehicles.some((v: any) =>
          v.assignments?.some((a: any) => a.userId === userId)
        );
        if (!isAssigned) return;

        const myUploads = licenses.filter((l: any) => l.userId === userId);
        if (myUploads.length === 0) { setShow(true); return; }

        const latest = myUploads[0];
        const expires = new Date(latest.expiresAt);
        const daysLeft = Math.floor((expires.getTime() - Date.now()) / 86400000);
        if (daysLeft < 30) setShow(true);
      } catch {}
    }
    check();
  }, [userId]);

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/fuehrerschein", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => setShow(false), 2000);
    }
  }

  function dismiss() {
    dismissed.current = true;
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#9eb552" }}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Führerscheinkontrolle</h3>
              <p className="text-sm text-gray-500">Halbjährliche Prüfung erforderlich</p>
            </div>
          </div>
          <button onClick={dismiss} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-700">Führerschein erfolgreich hochgeladen!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Da dir ein Firmenfahrzeug zugewiesen ist, musst du alle 6 Monate ein aktuelles Foto deines Führerscheins hochladen. Bitte mache jetzt ein Foto oder lade ein Bild hoch.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
            />
            <div className="flex gap-3">
              <Button className="flex-1 gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Camera className="h-4 w-4" />{uploading ? "Wird hochgeladen..." : "Foto aufnehmen / hochladen"}
              </Button>
              <Button variant="outline" onClick={dismiss}>Später</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
