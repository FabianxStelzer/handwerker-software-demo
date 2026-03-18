"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Lock,
  Building2,
  Save,
  CheckCircle2,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  position: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  role: string;
}

interface CompanySettings {
  id: string;
  name: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  vatId: string | null;
  lunchBreakMinutes: number;
  workHoursPerDay: number;
}

export default function EinstellungenPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [companySaveError, setCompanySaveError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", neu: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const [userRes, companyRes] = await Promise.all([
          fetch(`/api/mitarbeiter/${userId}`, { cache: "no-store", credentials: "same-origin" }),
          fetch("/api/settings/company", { cache: "no-store", credentials: "same-origin" }),
        ]);
        const userData = userRes.ok ? await userRes.json() : null;
        const companyData = companyRes.ok ? await companyRes.json() : null;
        if (userData && !userData.error) setProfile(userData);
        setCompany(
          companyData && !companyData.error
            ? companyData
            : { id: "", name: null, street: null, zip: null, city: null, phone: null, email: null, taxId: null, vatId: null, lunchBreakMinutes: 30, workHoursPerDay: 8 }
        );
      } catch (e) {
        console.error("Einstellungen laden:", e);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !userId) return;
    setProfileSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/mitarbeiter/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone ?? null,
          position: profile.position ?? null,
          street: profile.street ?? null,
          zip: profile.zip ?? null,
          city: profile.city ?? null,
        }),
        cache: "no-store",
        credentials: "same-origin",
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || `Fehler ${res.status}: Profil konnte nicht gespeichert werden.`;
        setProfileSaveError(msg);
      }
    } catch (err) {
      setProfileSaveError("Netzwerkfehler. Bitte Verbindung prüfen.");
      console.error("Profil speichern:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);

    if (passwordForm.neu !== passwordForm.confirm) {
      setPasswordError("Passwörter stimmen nicht überein");
      return;
    }
    if (passwordForm.neu.length < 6) {
      setPasswordError("Mindestens 6 Zeichen");
      return;
    }

    const res = await fetch(`/api/mitarbeiter/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordForm.neu }),
    });

    if (res.ok) {
      setPasswordSaved(true);
      setPasswordForm({ current: "", neu: "", confirm: "" });
      setTimeout(() => setPasswordSaved(false), 3000);
    } else {
      setPasswordError("Fehler beim Ändern des Passworts");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <Card className="p-8 text-center text-gray-500">
          Bitte melden Sie sich an, um die Einstellungen zu bearbeiten.
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <Card className="p-8 text-center text-gray-500">
          Profil konnte nicht geladen werden. Bitte Seite neu laden.
        </Card>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrator",
    BAULEITER: "Bauleiter",
    MITARBEITER: "Mitarbeiter",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-sm text-gray-500">Profil und Konto verwalten</p>
      </div>

      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">
            <User className="mr-2 h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="sicherheit">
            <Lock className="mr-2 h-4 w-4" />
            Sicherheit
          </TabsTrigger>
          <TabsTrigger value="firma">
            <Building2 className="mr-2 h-4 w-4" />
            Firma
          </TabsTrigger>
        </TabsList>

        {/* Profil */}
        <TabsContent value="profil">
          <Card className="p-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xl font-bold">
                  {profile.firstName[0]}{profile.lastName[0]}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profile.firstName} {profile.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">{roleLabels[profile.role] || profile.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Vorname</label>
                  <Input
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nachname</label>
                  <Input
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">E-Mail</label>
                  <Input value={profile.email} disabled className="mt-1 bg-gray-50" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Telefon</label>
                  <Input
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Position</label>
                  <Input
                    value={profile.position || ""}
                    onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-gray-700 mb-1">Privatadresse (für Route planen)</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Input
                      value={profile.street || ""}
                      onChange={(e) => setProfile({ ...profile, street: e.target.value })}
                      placeholder="Straße"
                      className="mt-1"
                    />
                    <Input
                      value={profile.zip || ""}
                      onChange={(e) => setProfile({ ...profile, zip: e.target.value })}
                      placeholder="PLZ"
                      className="mt-1"
                    />
                    <Input
                      value={profile.city || ""}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      placeholder="Stadt"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Rolle</label>
                  <Input value={roleLabels[profile.role] || profile.role} disabled className="mt-1 bg-gray-50" />
                </div>
              </div>

              {profileSaveError && <p className="text-sm text-red-600">{profileSaveError}</p>}
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Speichern..." : "Profil speichern"}
                </Button>
                {saved && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Gespeichert
                  </span>
                )}
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* Sicherheit */}
        <TabsContent value="sicherheit">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Passwort ändern</h3>
            <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Aktuelles Passwort</label>
                <Input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Neues Passwort</label>
                <Input
                  type="password"
                  value={passwordForm.neu}
                  onChange={(e) => setPasswordForm({ ...passwordForm, neu: e.target.value })}
                  className="mt-1"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Neues Passwort bestätigen</label>
                <Input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              <div className="flex items-center gap-3">
                <Button type="submit">
                  <Lock className="mr-2 h-4 w-4" />
                  Passwort ändern
                </Button>
                {passwordSaved && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Passwort geändert
                  </span>
                )}
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* Firma */}
        <TabsContent value="firma">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Firmeninformationen</h3>
            <p className="text-sm text-gray-500 mb-4">Adresse wird für „Route planen“ als Start- oder Zielpunkt verwendet.</p>
            {company ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCompanySaveError(null);
                  setCompanySaving(true);
                  try {
                    const res = await fetch("/api/settings/company", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: company.name ?? null,
                        street: company.street ?? null,
                        zip: company.zip ?? null,
                        city: company.city ?? null,
                        phone: company.phone ?? null,
                        email: company.email ?? null,
                        taxId: company.taxId ?? null,
                        vatId: company.vatId ?? null,
                        lunchBreakMinutes: company.lunchBreakMinutes,
                        workHoursPerDay: company.workHoursPerDay,
                      }),
                      cache: "no-store",
                      credentials: "same-origin",
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setCompany(updated);
                      setCompanySaved(true);
                      setTimeout(() => setCompanySaved(false), 3000);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      setCompanySaveError(err.error || `Fehler ${res.status}: Firmeneinstellungen konnten nicht gespeichert werden.`);
                    }
                  } catch (err) {
                    setCompanySaveError("Netzwerkfehler. Bitte Verbindung prüfen.");
                    console.error("Firma speichern:", err);
                  } finally {
                    setCompanySaving(false);
                  }
                }}
                className="max-w-md space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-gray-700">Firmenname</label>
                  <Input
                    value={company.name || ""}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    className="mt-1"
                    placeholder="Muster Schlosserei GmbH"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Straße *</label>
                  <Input
                    value={company.street || ""}
                    onChange={(e) => setCompany({ ...company, street: e.target.value })}
                    className="mt-1"
                    placeholder="Musterstraße 1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">PLZ</label>
                    <Input
                      value={company.zip || ""}
                      onChange={(e) => setCompany({ ...company, zip: e.target.value })}
                      className="mt-1"
                      placeholder="12345"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">Stadt *</label>
                    <Input
                      value={company.city || ""}
                      onChange={(e) => setCompany({ ...company, city: e.target.value })}
                      className="mt-1"
                      placeholder="Musterstadt"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Telefon</label>
                  <Input
                    value={company.phone || ""}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">E-Mail</label>
                  <Input
                    type="email"
                    value={company.email || ""}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Steuernummer</label>
                  <Input
                    value={company.taxId || ""}
                    onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">USt-IdNr.</label>
                  <Input
                    value={company.vatId || ""}
                    onChange={(e) => setCompany({ ...company, vatId: e.target.value })}
                    className="mt-1"
                    placeholder="DE..."
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Arbeitszeiteinstellungen</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Mittagspause (Minuten)</label>
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        value={company.lunchBreakMinutes ?? 30}
                        onChange={(e) => setCompany({ ...company, lunchBreakMinutes: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-400 mt-1">Wird ab 6h Arbeitszeit automatisch abgezogen</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Sollstunden/Tag</label>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        step={0.5}
                        value={company.workHoursPerDay ?? 8}
                        onChange={(e) => setCompany({ ...company, workHoursPerDay: parseFloat(e.target.value) || 8 })}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-400 mt-1">Für Überstundenberechnung</p>
                    </div>
                  </div>
                </div>
                {companySaveError && <p className="text-sm text-red-600">{companySaveError}</p>}
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={companySaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {companySaving ? "Speichern..." : "Firmeneinstellungen speichern"}
                  </Button>
                  {companySaved && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Gespeichert
                    </span>
                  )}
                </div>
              </form>
            ) : (
              <div className="flex h-32 items-center justify-center text-gray-400">
                Lade Firmendaten…
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
