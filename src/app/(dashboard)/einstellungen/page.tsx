"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, Lock, Building2, Save, CheckCircle2,
  Clock, FileText, Image, FileCode, Upload, Eye, Star, Trash2, Copy, Plus, Landmark,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import {
  getPlaceholdersForType, getDefaultTemplate, getSampleData,
  replaceTemplatePlaceholders, printDocument,
} from "@/lib/document-templates";

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
  logoUrl: string | null;
  website: string | null;
  fax: string | null;
  instagram: string | null;
  hourlyRate: number;
  gocardlessSecretId: string | null;
  gocardlessSecretKey: string | null;
}

const EMPTY_COMPANY: CompanySettings = {
  id: "", name: null, street: null, zip: null, city: null,
  phone: null, email: null, taxId: null, vatId: null,
  lunchBreakMinutes: 30, workHoursPerDay: 8,
  logoUrl: null, website: null, fax: null, instagram: null, hourlyRate: 55,
  gocardlessSecretId: null, gocardlessSecretKey: null,
};

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

  // Logo upload state
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<any[]>([]);
  const [tplType, setTplType] = useState<"RECHNUNG" | "ANGEBOT" | "REGIEBERICHT">("RECHNUNG");
  const [editingTpl, setEditingTpl] = useState<any>(null);
  const [tplName, setTplName] = useState("");
  const [tplHtml, setTplHtml] = useState("");
  const [tplSaving, setTplSaving] = useState(false);
  const tplFileRef = useRef<HTMLInputElement>(null);

  async function loadTemplates() {
    const res = await fetch("/api/document-templates");
    if (res.ok) setTemplates(await res.json());
  }

  useEffect(() => {
    const load = async () => {
      if (!userId) { setLoading(false); return; }
      try {
        const [userRes, companyRes] = await Promise.all([
          fetch(`/api/mitarbeiter/${userId}`, { cache: "no-store", credentials: "same-origin" }),
          fetch("/api/settings/company", { cache: "no-store", credentials: "same-origin" }),
        ]);
        const userData = userRes.ok ? await userRes.json() : null;
        const companyData = companyRes.ok ? await companyRes.json() : null;
        if (userData && !userData.error) setProfile(userData);
        setCompany(companyData && !companyData.error ? companyData : EMPTY_COMPANY);
      } catch (e) {
        console.error("Einstellungen laden:", e);
      }
      setLoading(false);
    };
    load();
    loadTemplates();
  }, [userId]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setCompany((prev) => prev ? { ...prev, logoUrl: data.logoUrl } : prev);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Upload fehlgeschlagen");
      }
    } catch {
      alert("Upload fehlgeschlagen");
    }
    setLogoUploading(false);
    e.target.value = "";
  }

  async function saveCompanyDirect(data: CompanySettings) {
    await fetch("/api/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name, street: data.street, zip: data.zip, city: data.city,
        phone: data.phone, email: data.email, taxId: data.taxId, vatId: data.vatId,
        lunchBreakMinutes: data.lunchBreakMinutes, workHoursPerDay: data.workHoursPerDay,
        logoUrl: data.logoUrl, website: data.website, fax: data.fax,
        instagram: data.instagram, hourlyRate: data.hourlyRate,
        gocardlessSecretId: data.gocardlessSecretId,
        gocardlessSecretKey: data.gocardlessSecretKey,
      }),
      cache: "no-store", credentials: "same-origin",
    });
  }

  function startNewTemplate() {
    setEditingTpl(null);
    setTplName(`Neue ${tplType === "RECHNUNG" ? "Rechnungs" : tplType === "ANGEBOT" ? "Angebots" : "Regiebericht"}-Vorlage`);
    setTplHtml(getDefaultTemplate(tplType));
  }

  function startEditTemplate(tpl: any) {
    setEditingTpl(tpl);
    setTplName(tpl.name);
    setTplHtml(tpl.html);
  }

  async function saveTemplate() {
    setTplSaving(true);
    if (editingTpl) {
      await fetch("/api/document-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTpl.id, name: tplName, html: tplHtml }),
      });
    } else {
      await fetch("/api/document-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tplType, name: tplName, html: tplHtml, isDefault: templates.filter((t) => t.type === tplType).length === 0 }),
      });
    }
    setTplSaving(false);
    setEditingTpl(null);
    setTplName("");
    setTplHtml("");
    loadTemplates();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Vorlage wirklich löschen?")) return;
    await fetch("/api/document-templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadTemplates();
  }

  async function setDefaultTemplate(id: string) {
    await fetch("/api/document-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, setDefault: true }),
    });
    loadTemplates();
  }

  function handleTplFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setTplHtml(content);
      if (!tplName || tplName.startsWith("Neue ")) setTplName(file.name.replace(/\.html?$/i, ""));
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function previewTemplate() {
    const data = getSampleData(tplType);
    const rendered = replaceTemplatePlaceholders(tplHtml, data);
    printDocument(rendered);
  }

  const filteredTemplates = templates.filter((t) => t.type === tplType);
  const placeholders = getPlaceholdersForType(tplType);

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
          firstName: profile.firstName, lastName: profile.lastName,
          phone: profile.phone ?? null, position: profile.position ?? null,
          street: profile.street ?? null, zip: profile.zip ?? null, city: profile.city ?? null,
        }),
        cache: "no-store", credentials: "same-origin",
      });
      if (res.ok) {
        setProfile(await res.json());
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setProfileSaveError(err.error || `Fehler ${res.status}`);
      }
    } catch {
      setProfileSaveError("Netzwerkfehler. Bitte Verbindung prüfen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);
    if (passwordForm.neu !== passwordForm.confirm) { setPasswordError("Passwörter stimmen nicht überein"); return; }
    if (passwordForm.neu.length < 6) { setPasswordError("Mindestens 6 Zeichen"); return; }
    const res = await fetch(`/api/mitarbeiter/${userId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
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

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setCompanySaveError(null);
    setCompanySaving(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.name, street: company.street, zip: company.zip, city: company.city,
          phone: company.phone, email: company.email, taxId: company.taxId, vatId: company.vatId,
          lunchBreakMinutes: company.lunchBreakMinutes, workHoursPerDay: company.workHoursPerDay,
          logoUrl: company.logoUrl, website: company.website, fax: company.fax,
          instagram: company.instagram, hourlyRate: company.hourlyRate,
          gocardlessSecretId: company.gocardlessSecretId,
          gocardlessSecretKey: company.gocardlessSecretKey,
        }),
        cache: "no-store", credentials: "same-origin",
      });
      if (res.ok) {
        setCompany(await res.json());
        setCompanySaved(true);
        setTimeout(() => setCompanySaved(false), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setCompanySaveError(err.error || `Fehler ${res.status}`);
      }
    } catch {
      setCompanySaveError("Netzwerkfehler.");
    } finally {
      setCompanySaving(false);
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  if (!userId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <Card className="p-8 text-center text-gray-500">Bitte melden Sie sich an.</Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <Card className="p-8 text-center text-gray-500">Profil konnte nicht geladen werden.</Card>
      </div>
    );
  }

  const roleLabels: Record<string, string> = { ADMIN: "Administrator", BAULEITER: "Bauleiter", MITARBEITER: "Mitarbeiter" };

  function SaveButton({ isSaving, isSaved }: { isSaving: boolean; isSaved: boolean }) {
    return (
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Speichern..." : "Speichern"}
        </Button>
        {isSaved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />Gespeichert
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-sm text-gray-500">Profil, Firma und Systemeinstellungen verwalten</p>
      </div>

      <Tabs defaultValue="profil">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profil">
            <User className="mr-2 h-4 w-4" />Profil
          </TabsTrigger>
          <TabsTrigger value="sicherheit">
            <Lock className="mr-2 h-4 w-4" />Sicherheit
          </TabsTrigger>
          <TabsTrigger value="firma">
            <Building2 className="mr-2 h-4 w-4" />Firma
          </TabsTrigger>
          <TabsTrigger value="logo">
            <Image className="mr-2 h-4 w-4" />Logo & Branding
          </TabsTrigger>
          <TabsTrigger value="arbeitszeit">
            <Clock className="mr-2 h-4 w-4" />Arbeitszeit
          </TabsTrigger>
          <TabsTrigger value="regieberichte">
            <FileText className="mr-2 h-4 w-4" />Regieberichte
          </TabsTrigger>
          <TabsTrigger value="vorlagen">
            <FileCode className="mr-2 h-4 w-4" />Dokumentvorlagen
          </TabsTrigger>
          <TabsTrigger value="banking">
            <Landmark className="mr-2 h-4 w-4" />Banking
          </TabsTrigger>
        </TabsList>

        {/* ── Profil ──────────────────────────────────── */}
        <TabsContent value="profil">
          <Card className="p-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xl font-bold">
                  {profile.firstName[0]}{profile.lastName[0]}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{profile.firstName} {profile.lastName}</h3>
                  <p className="text-sm text-gray-500">{roleLabels[profile.role] || profile.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
                <div>
                  <label className="text-sm font-medium text-gray-700">Vorname</label>
                  <Input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nachname</label>
                  <Input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">E-Mail</label>
                  <Input value={profile.email} disabled className="mt-1 bg-gray-50" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Telefon</label>
                  <Input value={profile.phone || ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Position</label>
                  <Input value={profile.position || ""} onChange={(e) => setProfile({ ...profile, position: e.target.value })} className="mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-gray-700 mb-1">Privatadresse</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Input value={profile.street || ""} onChange={(e) => setProfile({ ...profile, street: e.target.value })} placeholder="Straße" className="mt-1" />
                    <Input value={profile.zip || ""} onChange={(e) => setProfile({ ...profile, zip: e.target.value })} placeholder="PLZ" className="mt-1" />
                    <Input value={profile.city || ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Stadt" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Rolle</label>
                  <Input value={roleLabels[profile.role] || profile.role} disabled className="mt-1 bg-gray-50" />
                </div>
              </div>

              {profileSaveError && <p className="text-sm text-red-600">{profileSaveError}</p>}
              <SaveButton isSaving={saving} isSaved={saved} />
            </form>
          </Card>
        </TabsContent>

        {/* ── Sicherheit ──────────────────────────────── */}
        <TabsContent value="sicherheit">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Passwort ändern</h3>
            <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Aktuelles Passwort</label>
                <Input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="mt-1" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Neues Passwort</label>
                <Input type="password" value={passwordForm.neu} onChange={(e) => setPasswordForm({ ...passwordForm, neu: e.target.value })} className="mt-1" required minLength={6} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Neues Passwort bestätigen</label>
                <Input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="mt-1" required />
              </div>
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              <div className="flex items-center gap-3">
                <Button type="submit"><Lock className="mr-2 h-4 w-4" />Passwort ändern</Button>
                {passwordSaved && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" />Geändert</span>}
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* ── Firma ───────────────────────────────────── */}
        <TabsContent value="firma">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Firmeninformationen</h3>
            <p className="text-sm text-gray-500 mb-4">Adresse, Kontaktdaten und Steuerdaten deiner Firma.</p>
            {company ? (
              <form onSubmit={saveCompany} className="max-w-2xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Firmenname</label>
                    <Input value={company.name || ""} onChange={(e) => setCompany({ ...company, name: e.target.value })} className="mt-1" placeholder="Muster GmbH" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Straße</label>
                    <Input value={company.street || ""} onChange={(e) => setCompany({ ...company, street: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">PLZ</label>
                    <Input value={company.zip || ""} onChange={(e) => setCompany({ ...company, zip: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stadt</label>
                    <Input value={company.city || ""} onChange={(e) => setCompany({ ...company, city: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Telefon</label>
                    <Input value={company.phone || ""} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fax</label>
                    <Input value={company.fax || ""} onChange={(e) => setCompany({ ...company, fax: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">E-Mail</label>
                    <Input type="email" value={company.email || ""} onChange={(e) => setCompany({ ...company, email: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Website</label>
                    <Input value={company.website || ""} onChange={(e) => setCompany({ ...company, website: e.target.value })} className="mt-1" placeholder="www.beispiel.de" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Steuernummer</label>
                    <Input value={company.taxId || ""} onChange={(e) => setCompany({ ...company, taxId: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">USt-IdNr.</label>
                    <Input value={company.vatId || ""} onChange={(e) => setCompany({ ...company, vatId: e.target.value })} className="mt-1" placeholder="DE..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Instagram</label>
                    <Input value={company.instagram || ""} onChange={(e) => setCompany({ ...company, instagram: e.target.value })} className="mt-1" placeholder="@firmenname" />
                  </div>
                </div>
                {companySaveError && <p className="text-sm text-red-600">{companySaveError}</p>}
                <SaveButton isSaving={companySaving} isSaved={companySaved} />
              </form>
            ) : <div className="flex h-32 items-center justify-center text-gray-400">Lade Firmendaten…</div>}
          </Card>
        </TabsContent>

        {/* ── Logo & Branding ─────────────────────────── */}
        <TabsContent value="logo">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Logo & Branding</h3>
            <p className="text-sm text-gray-500 mb-4">Firmenlogo für Regieberichte, Rechnungen und Angebote.</p>
            {company ? (
              <div className="max-w-2xl space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Firmenlogo</label>
                  {company.logoUrl ? (
                    <div className="flex items-center gap-4 mb-3">
                      <img src={company.logoUrl} alt="Logo" className="h-20 max-w-[250px] object-contain border rounded-lg p-2 bg-white" />
                      <div className="space-y-2">
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => logoFileRef.current?.click()}>
                          <Upload className="h-3.5 w-3.5" />Logo ändern
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="text-red-500 gap-1.5" onClick={async () => { setCompany({ ...company, logoUrl: null }); await saveCompanyDirect({ ...company, logoUrl: null }); }}>
                          <Trash2 className="h-3.5 w-3.5" />Entfernen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                      onClick={() => logoFileRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">Logo hochladen</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG oder WebP · Empfohlen: 300x100px</p>
                    </div>
                  )}
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  {logoUploading && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Logo wird hochgeladen...
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Vorschau auf Dokumenten</h4>
                  <div className="border rounded-lg p-4 bg-gray-50 max-w-md">
                    <div className="flex items-start justify-between border-b pb-3 mb-3">
                      <div>
                        {company.logoUrl
                          ? <img src={company.logoUrl} alt="Logo" className="h-12 max-w-[150px] object-contain" />
                          : <div className="h-12 w-32 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">Kein Logo</div>
                        }
                        <p className="text-xs font-semibold mt-1">{company.name || "Firmenname"}</p>
                      </div>
                      <div className="text-right text-[10px] text-gray-500">
                        {company.street && <p>{company.street}</p>}
                        <p>{[company.zip, company.city].filter(Boolean).join(" ") || "Adresse"}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 text-center">Regiebericht / Rechnung Inhalt...</p>
                    <div className="border-t mt-3 pt-2 text-center text-[9px] text-gray-400">
                      {company.name || "Firma"} · {[company.street, [company.zip, company.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
                      {company.phone && <> · T: {company.phone}</>}
                      {company.email && <> · {company.email}</>}
                    </div>
                  </div>
                </div>
              </div>
            ) : <div className="flex h-32 items-center justify-center text-gray-400">Lade Firmendaten…</div>}
          </Card>
        </TabsContent>

        {/* ── Arbeitszeit ─────────────────────────────── */}
        <TabsContent value="arbeitszeit">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Arbeitszeiteinstellungen</h3>
            <p className="text-sm text-gray-500 mb-4">Mittagspause und Sollstunden für die Zeiterfassung.</p>
            {company ? (
              <form onSubmit={saveCompany} className="max-w-md space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Mittagspause (Minuten)</label>
                  <Input
                    type="number" min={0} max={120}
                    value={company.lunchBreakMinutes ?? 30}
                    onChange={(e) => setCompany({ ...company, lunchBreakMinutes: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Wird ab 6h Arbeitszeit automatisch abgezogen</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Sollstunden pro Tag</label>
                  <Input
                    type="number" min={1} max={12} step={0.5}
                    value={company.workHoursPerDay ?? 8}
                    onChange={(e) => setCompany({ ...company, workHoursPerDay: parseFloat(e.target.value) || 8 })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Für Überstundenberechnung</p>
                </div>
                {companySaveError && <p className="text-sm text-red-600">{companySaveError}</p>}
                <SaveButton isSaving={companySaving} isSaved={companySaved} />
              </form>
            ) : <div className="flex h-32 items-center justify-center text-gray-400">Lade…</div>}
          </Card>
        </TabsContent>

        {/* ── Regieberichte ───────────────────────────── */}
        <TabsContent value="regieberichte">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Regiebericht-Einstellungen</h3>
            <p className="text-sm text-gray-500 mb-4">Stundensatz und Standardwerte für automatische Rechnungserstellung.</p>
            {company ? (
              <form onSubmit={saveCompany} className="max-w-md space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Stundensatz (€/Std.)</label>
                  <Input
                    type="number" min={0} step={0.5}
                    value={company.hourlyRate ?? 55}
                    onChange={(e) => setCompany({ ...company, hourlyRate: parseFloat(e.target.value) || 55 })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Wird für die automatische Rechnungserstellung aus Regieberichten verwendet. Jeder eingetragene Mitarbeiter wird mit diesem Stundensatz abgerechnet.</p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Beispielrechnung</h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Mitarbeiter A – 8:00 Std.</span>
                      <span className="font-medium">{((company.hourlyRate || 55) * 8).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Mitarbeiter B – 6:30 Std.</span>
                      <span className="font-medium">{((company.hourlyRate || 55) * 6.5).toFixed(2)} €</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Netto Arbeitskosten</span>
                      <span>{((company.hourlyRate || 55) * 14.5).toFixed(2)} €</span>
                    </div>
                    <p className="text-xs text-gray-400">+ Material + 19% MwSt.</p>
                  </div>
                </div>

                {companySaveError && <p className="text-sm text-red-600">{companySaveError}</p>}
                <SaveButton isSaving={companySaving} isSaved={companySaved} />
              </form>
            ) : <div className="flex h-32 items-center justify-center text-gray-400">Lade…</div>}
          </Card>
        </TabsContent>

        {/* ── Dokumentvorlagen ──────────────────────────── */}
        <TabsContent value="vorlagen">
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Dokumentvorlagen</h3>
                  <p className="text-sm text-gray-500">HTML-Vorlagen für Rechnungen, Angebote und Regieberichte verwalten.</p>
                </div>
                <NativeSelect value={tplType} onChange={(e) => { setTplType(e.target.value as any); setTplHtml(""); setTplName(""); setEditingTpl(null); }} className="w-48">
                  <option value="RECHNUNG">Rechnung</option>
                  <option value="ANGEBOT">Angebot</option>
                  <option value="REGIEBERICHT">Regiebericht</option>
                </NativeSelect>
              </div>

              {/* Existing templates list */}
              {filteredTemplates.length > 0 && (
                <div className="space-y-2 mb-4">
                  {filteredTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {tpl.isDefault && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                        <span className="text-sm font-medium">{tpl.name}</span>
                        {tpl.isDefault && <span className="text-xs text-gray-400">(Standard)</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {!tpl.isDefault && (
                          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setDefaultTemplate(tpl.id)}>
                            <Star className="h-3 w-3" />Als Standard
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => startEditTemplate(tpl)}>
                          <FileCode className="h-3 w-3" />Bearbeiten
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs gap-1 text-red-500" onClick={() => deleteTemplate(tpl.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!tplHtml ? (
                <div className="flex gap-3">
                  <Button size="sm" className="gap-1.5" onClick={startNewTemplate}>
                    <Plus className="h-4 w-4" />Neue Vorlage erstellen
                  </Button>
                  <input ref={tplFileRef} type="file" accept=".html,.htm" className="hidden" onChange={handleTplFileUpload} />
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { startNewTemplate(); setTimeout(() => tplFileRef.current?.click(), 100); }}>
                    <Upload className="h-4 w-4" />HTML-Datei hochladen
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600">Vorlagenname</label>
                      <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Meine Vorlage" />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input ref={tplFileRef} type="file" accept=".html,.htm" className="hidden" onChange={handleTplFileUpload} />
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => tplFileRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5" />Datei laden
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={previewTemplate}>
                        <Eye className="h-3.5 w-3.5" />Vorschau
                      </Button>
                      <Button size="sm" className="gap-1" onClick={saveTemplate} disabled={tplSaving || !tplName}>
                        <Save className="h-3.5 w-3.5" />{tplSaving ? "Speichern..." : "Speichern"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setTplHtml(""); setTplName(""); setEditingTpl(null); }}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Editor */}
                    <div className="lg:col-span-3">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">HTML-Code</label>
                      <Textarea
                        value={tplHtml}
                        onChange={(e) => setTplHtml(e.target.value)}
                        className="font-mono text-xs min-h-[500px] leading-relaxed"
                        spellCheck={false}
                      />
                    </div>

                    {/* Placeholder reference */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Verfügbare Platzhalter</label>
                      <div className="border rounded-lg p-3 bg-gray-50 space-y-1 max-h-[500px] overflow-y-auto">
                        <p className="text-xs text-gray-400 mb-2">Klicke zum Kopieren. Füge diese in dein HTML ein:</p>
                        {placeholders.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white transition-colors flex items-center justify-between group"
                            onClick={() => { navigator.clipboard.writeText(`{{${p.key}}}`); }}
                            title={`{{${p.key}}} kopieren`}
                          >
                            <span>
                              <code className="text-blue-600 font-mono">{`{{${p.key}}}`}</code>
                              <span className="text-gray-500 ml-1.5">{p.label}</span>
                            </span>
                            <Copy className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ── Banking ──────────────────────────────── */}
        <TabsContent value="banking">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Banking-Integration</h3>
            <p className="text-sm text-gray-500 mb-4">
              Verbinde dein Bankkonto über GoCardless (Open Banking), um Kontostände und Umsätze automatisch abzurufen.
            </p>
            {company ? (
              <form onSubmit={saveCompany} className="max-w-2xl space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium mb-1">GoCardless Bank Account Data API</p>
                  <p className="text-xs">
                    Erstelle ein kostenloses Konto auf{" "}
                    <a href="https://bankaccountdata.gocardless.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      bankaccountdata.gocardless.com
                    </a>
                    {" "}und kopiere die Zugangsdaten (Secret ID und Secret Key) aus dem Bereich "User Secrets" hierher.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Secret ID</label>
                  <Input
                    value={company.gocardlessSecretId || ""}
                    onChange={(e) => setCompany({ ...company, gocardlessSecretId: e.target.value || null })}
                    className="mt-1 font-mono text-xs"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Secret Key</label>
                  <Input
                    type="password"
                    value={company.gocardlessSecretKey || ""}
                    onChange={(e) => setCompany({ ...company, gocardlessSecretKey: e.target.value || null })}
                    className="mt-1 font-mono text-xs"
                    placeholder="••••••••"
                  />
                </div>

                {companySaveError && <p className="text-sm text-red-600">{companySaveError}</p>}
                <SaveButton isSaving={companySaving} isSaved={companySaved} />

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500">
                    Nach dem Speichern der Zugangsdaten kannst du unter <strong>Buchhaltung</strong> dein Bankkonto verbinden.
                  </p>
                </div>
              </form>
            ) : <div className="flex h-32 items-center justify-center text-gray-400">Lade…</div>}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
