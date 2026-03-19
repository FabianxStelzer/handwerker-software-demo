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
  Bot, Zap, Shield, Server, ExternalLink, Check, X as XIcon, Loader2, MessageSquare, Ruler,
  Calculator, Settings2, Users, Briefcase, Mail, Hash, Download,
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
          <TabsTrigger value="ki-modelle">
            <Bot className="mr-2 h-4 w-4" />KI-Modelle
          </TabsTrigger>
          <TabsTrigger value="buchhaltung-settings">
            <Calculator className="mr-2 h-4 w-4" />Buchhaltung
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
        {/* ── KI-Modelle ──────────────────────────── */}
        <TabsContent value="ki-modelle">
          <KiModelleTab />
        </TabsContent>

        {/* ── Buchhaltung ──────────────────────────── */}
        <TabsContent value="buchhaltung-settings">
          <BuchhaltungSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── KI-Modelle Tab ───────────────────────────────────────────

interface AiProvider {
  id: string; name: string; provider: string; apiKey: string | null;
  apiUrl: string | null; model: string | null; isActive: boolean;
  isDefault: boolean; isLocal: boolean;
}

const PROVIDER_PRESETS: Record<string, { label: string; icon: string; color: string; models: string[]; needsApiKey: boolean; needsApiUrl: boolean }> = {
  anthropic: {
    label: "Claude (Anthropic)", icon: "🟣", color: "purple",
    models: [
      "claude-sonnet-4-6",
      "claude-sonnet-4-20250514",
      "claude-opus-4-20250514",
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-haiku-20240307",
    ],
    needsApiKey: true, needsApiUrl: false,
  },
  google: {
    label: "Gemini (Google)", icon: "🔵", color: "blue",
    models: [
      "gemini-2.5-pro-preview-05-06",
      "gemini-2.5-flash-preview-04-17",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
    needsApiKey: true, needsApiUrl: false,
  },
  openai: {
    label: "ChatGPT (OpenAI)", icon: "🟢", color: "green",
    models: [
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "o4-mini",
      "o3",
      "o3-mini",
      "o1",
      "o1-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
    ],
    needsApiKey: true, needsApiUrl: false,
  },
  ollama: {
    label: "Ollama (Lokal)", icon: "🖥️", color: "gray",
    models: [
      "llama3.3",
      "llama3.2",
      "llama3.1",
      "gemma3",
      "gemma2",
      "qwen2.5",
      "mistral",
      "mixtral",
      "codellama",
      "deepseek-r1",
      "deepseek-coder-v2",
      "phi4",
      "phi3",
      "command-r",
    ],
    needsApiKey: false, needsApiUrl: true,
  },
};

function KiModelleTab() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addProvider, setAddProvider] = useState("anthropic");
  const [addName, setAddName] = useState("");
  const [addApiKey, setAddApiKey] = useState("");
  const [addApiUrl, setAddApiUrl] = useState("http://localhost:11434");
  const [addModel, setAddModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editApiKey, setEditApiKey] = useState("");
  const [editApiUrl, setEditApiUrl] = useState("");
  const [editModel, setEditModel] = useState("");
  const [aiChatProviderId, setAiChatProviderId] = useState("");
  const [aiAufmassProviderId, setAiAufmassProviderId] = useState("");
  const [aiChatSystemPrompt, setAiChatSystemPrompt] = useState("");
  const [aiAufmassSystemPrompt, setAiAufmassSystemPrompt] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignSaved, setAssignSaved] = useState(false);

  const load = React.useCallback(async () => {
    const [provRes, settingsRes] = await Promise.all([
      fetch("/api/ai-providers"),
      fetch("/api/settings/company"),
    ]);
    if (provRes.ok) setProviders(await provRes.json());
    if (settingsRes.ok) {
      const s = await settingsRes.json();
      setAiChatProviderId(s.aiChatProviderId || "");
      setAiAufmassProviderId(s.aiAufmassProviderId || "");
      setAiChatSystemPrompt(s.aiChatSystemPrompt || "");
      setAiAufmassSystemPrompt(s.aiAufmassSystemPrompt || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveAssignments() {
    setAssignSaving(true);
    await fetch("/api/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiChatProviderId: aiChatProviderId || null,
        aiAufmassProviderId: aiAufmassProviderId || null,
        aiChatSystemPrompt: aiChatSystemPrompt || null,
        aiAufmassSystemPrompt: aiAufmassSystemPrompt || null,
      }),
    });
    setAssignSaving(false);
    setAssignSaved(true);
    setTimeout(() => setAssignSaved(false), 2000);
  }

  async function addProviderFn() {
    setSaving(true);
    const preset = PROVIDER_PRESETS[addProvider];
    const res = await fetch("/api/ai-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addName || preset.label,
        provider: addProvider,
        apiKey: preset.needsApiKey ? addApiKey : null,
        apiUrl: addProvider === "ollama" ? addApiUrl : null,
        model: addModel || preset.models[0],
        isLocal: addProvider === "ollama",
      }),
    });
    if (res.ok) {
      const newProvider = await res.json();
      await load();
      setAddOpen(false);
      setAddApiKey(""); setAddName(""); setAddModel("");
      // Automatisch Verbindung testen
      setTesting(newProvider.id);
      const testRes = await fetch("/api/ai-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", providerId: newProvider.id }),
      });
      const testData = await testRes.json();
      setTestResult({ id: newProvider.id, success: testData.success, message: testData.message || testData.error });
      setTesting(null);
    }
    setSaving(false);
  }

  async function testConnection(p: AiProvider) {
    setTesting(p.id);
    setTestResult(null);
    const res = await fetch("/api/ai-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", providerId: p.id }),
    });
    const data = await res.json();
    setTestResult({ id: p.id, success: data.success, message: data.message || data.error });
    if (data.models) setOllamaModels(data.models);
    setTesting(null);
  }

  function startEditing(p: AiProvider) {
    setEditingId(p.id);
    setEditApiKey("");
    setEditApiUrl(p.apiUrl || "http://localhost:11434");
    setEditModel(p.model || "");
    setTestResult(null);
  }

  async function saveEdit(p: AiProvider) {
    setSaving(true);
    const body: any = { id: p.id };
    if (editApiKey) body.apiKey = editApiKey;
    if (editApiUrl && p.isLocal) body.apiUrl = editApiUrl;
    if (editModel) body.model = editModel;
    await fetch("/api/ai-providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
    setEditingId(null);
    setEditApiKey("");
    setSaving(false);
  }

  async function testNewConnection() {
    setTesting("new");
    setTestResult(null);
    const preset = PROVIDER_PRESETS[addProvider];
    const res = await fetch("/api/ai-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "test",
        provider: addProvider,
        apiKey: preset.needsApiKey ? addApiKey : null,
        apiUrl: addProvider === "ollama" ? addApiUrl : null,
        model: addModel || preset.models[0],
      }),
    });
    const data = await res.json();
    setTestResult({ id: "new", success: data.success, message: data.message || data.error });
    if (data.models) setOllamaModels(data.models);
    setTesting(null);
  }

  async function setDefault(id: string) {
    await fetch("/api/ai-providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setDefault", id }),
    });
    await load();
  }

  async function toggleActive(p: AiProvider) {
    await fetch("/api/ai-providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
    });
    await load();
  }

  async function deleteProvider(id: string) {
    if (!confirm("KI-Modell wirklich entfernen?")) return;
    await fetch("/api/ai-providers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  if (loading) return <Card className="p-6"><div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div></Card>;

  return (
    <div className="space-y-4">
      {/* Info */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Datenschutz & KI-Modelle</h3>
            <p className="text-xs text-gray-500 mt-1">
              Du kannst <strong>externe KI-Dienste</strong> (Claude, Gemini, ChatGPT) über API-Keys anbinden oder
              <strong> lokale Modelle</strong> (Ollama) direkt auf deinem Server installieren.
              Lokale Modelle verarbeiten alle Daten ausschließlich auf deinem Server – vollständig DSGVO-konform.
            </p>
          </div>
        </div>
      </Card>

      {/* KI-Zuordnung */}
      {providers.filter((p) => p.isActive).length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">KI-Zuordnung pro Funktion</h3>
          <p className="text-xs text-gray-500 mb-3">Lege fest, welches KI-Modell für welche Funktion verwendet wird. Wenn nichts ausgewählt ist, wird das Standard-Modell verwendet.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />KI-Assistent (Chat)
                </label>
                <NativeSelect value={aiChatProviderId} onChange={(e) => setAiChatProviderId(e.target.value)} className="text-sm h-10">
                  <option value="">Standard-Modell verwenden</option>
                  {providers.filter((p) => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.model || "Standard"}){p.isLocal ? " 🖥️" : ""}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Anweisungen für den Chat</label>
                <Textarea
                  value={aiChatSystemPrompt}
                  onChange={(e) => setAiChatSystemPrompt(e.target.value)}
                  placeholder="z.B. Antworte immer kurz und präzise. Verwende Fachbegriffe. Beziehe dich auf DIN-Normen..."
                  rows={3}
                  className="text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">Zusätzliche Anweisungen, die der KI im Chat mitgegeben werden</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Ruler className="h-3.5 w-3.5 text-green-600" />Aufmaß (Analyse & Generierung)
                </label>
                <NativeSelect value={aiAufmassProviderId} onChange={(e) => setAiAufmassProviderId(e.target.value)} className="text-sm h-10">
                  <option value="">Standard-Modell verwenden</option>
                  {providers.filter((p) => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.model || "Standard"}){p.isLocal ? " 🖥️" : ""}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Anweisungen für das Aufmaß</label>
                <Textarea
                  value={aiAufmassSystemPrompt}
                  onChange={(e) => setAiAufmassSystemPrompt(e.target.value)}
                  placeholder="z.B. Gib nur die Antwort ohne Erklärung. Gebäudetyp: Einfamilienhaus. Heizlast nach DIN 12831 berechnen. Stundensatz: 65€/h..."
                  rows={3}
                  className="text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">Eckdaten und Regeln für die Aufmaß-KI (z.B. Antwortformat, Berechnungsgrundlagen, Firmendaten)</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" className="gap-1.5 text-xs" onClick={saveAssignments} disabled={assignSaving}>
              {assignSaving ? "Speichere…" : assignSaved ? <><Check className="h-3 w-3" />Gespeichert</> : <><Save className="h-3 w-3" />Zuordnung speichern</>}
            </Button>
          </div>
        </Card>
      )}

      {/* Provider List */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Konfigurierte KI-Modelle</h3>
          <Button size="sm" className="gap-1.5" onClick={() => { setAddOpen(!addOpen); setTestResult(null); }}>
            <Plus className="h-3.5 w-3.5" />Hinzufügen
          </Button>
        </div>

        {providers.length === 0 && !addOpen ? (
          <div className="text-center py-8">
            <Bot className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Noch keine KI-Modelle konfiguriert</p>
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />KI-Modell hinzufügen
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => {
              const preset = PROVIDER_PRESETS[p.provider];
              const result = testResult?.id === p.id ? testResult : null;
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} className={`border rounded-lg p-4 ${!p.isActive ? "opacity-50" : ""} ${p.isDefault ? "border-blue-300 bg-blue-50/30" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{preset?.icon || "🤖"}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900">{p.name}</p>
                          {p.isDefault && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Standard</span>}
                          {p.isLocal && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5"><Shield className="h-2.5 w-2.5" />Lokal</span>}
                        </div>
                        <p className="text-xs text-gray-500">{preset?.label || p.provider} · {p.model || "Standard"}</p>
                        {p.apiKey && <p className="text-[10px] text-gray-400 mt-0.5 font-mono">API-Key: {p.apiKey}</p>}
                        {p.apiUrl && <p className="text-[10px] text-gray-400 font-mono">URL: {p.apiUrl}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => testConnection(p)} disabled={testing === p.id}>
                        {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}Verbindung testen
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => isEditing ? setEditingId(null) : startEditing(p)}>
                        <Eye className="h-3 w-3" />{isEditing ? "Schließen" : "Bearbeiten"}
                      </Button>
                      {!p.isDefault && (
                        <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setDefault(p.id)}>
                          <Star className="h-3 w-3" />Standard
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => toggleActive(p)}>
                        {p.isActive ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteProvider(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Edit Form */}
                  {isEditing && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      {preset?.needsApiKey && (
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">API-Key ändern</label>
                          <Input type="password" value={editApiKey} onChange={(e) => setEditApiKey(e.target.value)}
                            placeholder="Neuen API-Key eingeben…"
                            className="text-sm font-mono" />
                          <p className="text-[10px] text-gray-400 mt-1">
                            {p.provider === "anthropic" && <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">API-Key bei Anthropic erstellen <ExternalLink className="h-2.5 w-2.5" /></a>}
                            {p.provider === "openai" && <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">API-Key bei OpenAI erstellen <ExternalLink className="h-2.5 w-2.5" /></a>}
                            {p.provider === "google" && <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">API-Key bei Google erstellen <ExternalLink className="h-2.5 w-2.5" /></a>}
                          </p>
                        </div>
                      )}
                      {p.isLocal && (
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Server-URL</label>
                          <Input value={editApiUrl} onChange={(e) => setEditApiUrl(e.target.value)} className="text-sm font-mono" />
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Modell</label>
                        <Input
                          list={`edit-models-${p.id}`}
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          placeholder={p.model || "Modellname eingeben"}
                          className="text-sm"
                        />
                        <datalist id={`edit-models-${p.id}`}>
                          {(preset?.models || []).map((m) => (
                            <option key={m} value={m} />
                          ))}
                          {p.model && !(preset?.models || []).includes(p.model) && (
                            <option value={p.model} />
                          )}
                        </datalist>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="gap-1.5 text-xs" onClick={() => saveEdit(p)} disabled={saving}>
                          <Save className="h-3 w-3" />{saving ? "Speichere…" : "Speichern"}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditingId(null)}>Abbrechen</Button>
                      </div>
                    </div>
                  )}

                  {result && (
                    <div className={`mt-2 px-3 py-2 rounded text-xs flex items-center gap-1.5 ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      {result.success ? <Check className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                      {result.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Form */}
        {addOpen && (
          <div className="mt-4 border-t pt-4 space-y-3">
            <h4 className="text-sm font-bold text-gray-900">Neues KI-Modell hinzufügen</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                <button key={key}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${addProvider === key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                  onClick={() => { setAddProvider(key); setAddModel(preset.models[0]); setTestResult(null); }}>
                  <span className="text-2xl block">{preset.icon}</span>
                  <p className="text-xs font-medium mt-1">{preset.label}</p>
                  {key === "ollama" && <p className="text-[10px] text-green-600 mt-0.5 flex items-center justify-center gap-0.5"><Shield className="h-2.5 w-2.5" />DSGVO-konform</p>}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Name (optional)</label>
                <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={PROVIDER_PRESETS[addProvider].label} className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Modell</label>
                <Input
                  list={`models-${addProvider}`}
                  value={addModel}
                  onChange={(e) => setAddModel(e.target.value)}
                  placeholder={PROVIDER_PRESETS[addProvider].models[0]}
                  className="text-sm"
                />
                <datalist id={`models-${addProvider}`}>
                  {PROVIDER_PRESETS[addProvider].models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                  {ollamaModels.filter((m) => !PROVIDER_PRESETS[addProvider].models.includes(m)).map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                <p className="text-[10px] text-gray-400 mt-1">Wähle ein Modell aus der Liste oder gib einen eigenen Modellnamen ein</p>
              </div>
            </div>

            {PROVIDER_PRESETS[addProvider].needsApiKey && (
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">API-Key</label>
                <Input type="password" value={addApiKey} onChange={(e) => setAddApiKey(e.target.value)}
                  placeholder={addProvider === "anthropic" ? "sk-ant-..." : addProvider === "openai" ? "sk-..." : "AIza..."}
                  className="text-sm font-mono" />
                <p className="text-[10px] text-gray-400 mt-1">
                  {addProvider === "anthropic" && <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">API-Key bei Anthropic erstellen <ExternalLink className="h-2.5 w-2.5" /></a>}
                  {addProvider === "openai" && <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">API-Key bei OpenAI erstellen <ExternalLink className="h-2.5 w-2.5" /></a>}
                  {addProvider === "google" && <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">API-Key bei Google erstellen <ExternalLink className="h-2.5 w-2.5" /></a>}
                </p>
              </div>
            )}

            {addProvider === "ollama" && (
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Ollama Server-URL</label>
                <Input value={addApiUrl} onChange={(e) => setAddApiUrl(e.target.value)} placeholder="http://localhost:11434" className="text-sm font-mono" />
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                  <p className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5"><Server className="h-3.5 w-3.5" />Ollama auf deinem Server installieren:</p>
                  <code className="text-[11px] bg-gray-200 rounded px-2 py-1 block mt-1 font-mono">curl -fsSL https://ollama.com/install.sh | sh</code>
                  <code className="text-[11px] bg-gray-200 rounded px-2 py-1 block mt-1 font-mono">ollama pull llama3.1</code>
                  <p className="text-[10px] text-gray-500 mt-2">Ollama läuft komplett auf deinem Server. Keine Daten verlassen dein Netzwerk.</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={testNewConnection} disabled={testing === "new"}>
                {testing === "new" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}Verbindung testen
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={addProviderFn} disabled={saving || (PROVIDER_PRESETS[addProvider].needsApiKey && !addApiKey)}>
                {saving ? <><Loader2 className="h-3 w-3 animate-spin" />Verbindung wird hergestellt…</> : <><Zap className="h-3.5 w-3.5" />Verbindung herstellen & Speichern</>}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAddOpen(false)}>Abbrechen</Button>
            </div>

            {testResult?.id === "new" && (
              <div className={`px-3 py-2 rounded text-xs flex items-center gap-1.5 ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {testResult.success ? <Check className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                {testResult.message}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Buchhaltung Settings Tab ─────────────────────────────────

const BUCH_SECTIONS = [
  { key: "allgemein", label: "Allgemeine Einstellungen" },
  { key: "benutzer", label: "Benutzer und Berechtigungen" },
  { key: "steuerberater", label: "Mein Steuerberater" },
  { key: "email", label: "E-Mail Versand" },
  { key: "nummernkreise", label: "Nummernkreise" },
  { key: "export", label: "Export" },
] as const;

function BuchhaltungSettingsTab() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!activeSection) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BUCH_SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className="rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all px-6 py-5 text-center text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {s.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setActiveSection(null)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        ← Zurück zur Übersicht
      </button>

      {activeSection === "allgemein" && <BuchAllgemeinSection />}
      {activeSection === "benutzer" && <BuchBenutzerSection />}
      {activeSection === "steuerberater" && <BuchSteuerberaterSection />}
      {!["allgemein", "benutzer", "steuerberater"].includes(activeSection!) && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {BUCH_SECTIONS.find((s) => s.key === activeSection)?.label}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Einstellungen für {BUCH_SECTIONS.find((s) => s.key === activeSection)?.label}.
          </p>
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">Inhalte werden konfiguriert...</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Allgemeine Einstellungen ──────────────────────────────────

const BUNDESLAENDER = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen",
  "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen",
  "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen",
  "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
];

const UNTERNEHMENSTYPEN = [
  { value: "einzelunternehmen", label: "Einzelunternehmen" },
  { value: "freelancer", label: "Freiberufler" },
  { value: "gbr", label: "GbR" },
  { value: "gmbh", label: "GmbH" },
  { value: "ug", label: "UG (haftungsbeschränkt)" },
  { value: "ohg", label: "OHG" },
  { value: "kg", label: "KG" },
  { value: "gmbh-co-kg", label: "GmbH & Co. KG" },
  { value: "ag", label: "AG" },
  { value: "ev", label: "e.V." },
];

function BuchAllgemeinSection() {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/company")
      .then((r) => r.json())
      .then((s) => {
        setData({
          name: s.name || "",
          preisAufBelegen: s.preisAufBelegen || "netto",
          unternehmenstyp: s.unternehmenstyp || "einzelunternehmen",
          gewinnermittlung: s.gewinnermittlung || "euer",
          bundesland: s.bundesland || "",
          vatId: s.vatId || "",
          taxId: s.taxId || "",
          besteuerung: s.besteuerung || "",
          euUmsatzsteuer: s.euUmsatzsteuer || "",
          pvNullsteuer: !!s.pvNullsteuer,
          kontenrahmen: s.kontenrahmen || "skr04",
          hatSteuerberater: !!s.hatSteuerberater,
        });
        setLoading(false);
      });
  }, []);

  function upd(key: string, val: any) {
    setData((d) => ({ ...d, [key]: val }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#9eb552] border-t-transparent" /></div>;
  }

  function Radio({ name, value, checked, onChange, label, desc }: { name: string; value: string; checked: boolean; onChange: () => void; label: string; desc?: string }) {
    return (
      <label className="flex items-start gap-2.5 cursor-pointer group">
        <input type="radio" name={name} value={value} checked={checked} onChange={onChange}
          className="mt-0.5 h-4 w-4 accent-[#354360]" />
        <span>
          <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
          {desc && <span className="block text-xs text-gray-400 mt-0.5">{desc}</span>}
        </span>
      </label>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Allgemeine Einstellungen</h2>
        <span className="text-xs text-gray-400">* Pflichtfelder</span>
      </div>

      <Card className="p-6">
        <div className="max-w-2xl space-y-8">
          {/* Firmenname */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-start">
            <label className="text-sm font-medium text-gray-700 pt-2 text-right">Firmenname*</label>
            <Input value={data.name} onChange={(e) => upd("name", e.target.value)} />
          </div>

          {/* Preise auf Belegen */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-start">
            <label className="text-sm font-medium text-gray-700 pt-1 text-right">Preise auf Belegen</label>
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Bei Bruttopreisen ist die Umsatzsteuer bereits enthalten. Bei Nettopreisen wird die Steuer in Ihren Belegen getrennt berechnet und aufgeführt. Oder ist Ihr Unternehmen umsatzsteuerbefreit? Dann wählen Sie die entsprechende Option.
              </p>
              <div className="space-y-2">
                <Radio name="preisAufBelegen" value="netto" checked={data.preisAufBelegen === "netto"} onChange={() => upd("preisAufBelegen", "netto")} label="Netto-Preise (USt. wird getrennt ausgewiesen)" />
                <Radio name="preisAufBelegen" value="brutto" checked={data.preisAufBelegen === "brutto"} onChange={() => upd("preisAufBelegen", "brutto")} label="Brutto-Preise (USt. ist im Preis enthalten)" />
                <Radio name="preisAufBelegen" value="umsatzsteuerfrei" checked={data.preisAufBelegen === "umsatzsteuerfrei"} onChange={() => upd("preisAufBelegen", "umsatzsteuerfrei")} label="Umsatzsteuerbefreit" />
              </div>
            </div>
          </div>

          {/* Unternehmenstyp */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-center">
            <label className="text-sm font-medium text-gray-700 text-right">Unternehmenstyp</label>
            <NativeSelect value={data.unternehmenstyp} onChange={(e) => upd("unternehmenstyp", e.target.value)} className="max-w-sm">
              {UNTERNEHMENSTYPEN.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </NativeSelect>
          </div>

          {/* Gewinnermittlung */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-start">
            <label className="text-sm font-medium text-gray-700 pt-1 text-right">Gewinnermittlung</label>
            <div className="space-y-2">
              <Radio name="gewinnermittlung" value="euer" checked={data.gewinnermittlung === "euer"} onChange={() => upd("gewinnermittlung", "euer")} label="EÜR" />
              <Radio name="gewinnermittlung" value="bilanzierung" checked={data.gewinnermittlung === "bilanzierung"} onChange={() => upd("gewinnermittlung", "bilanzierung")} label="Bilanzierung" />
            </div>
          </div>

          {/* Bundesland */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-center">
            <label className="text-sm font-medium text-gray-700 text-right">Bundesland</label>
            <NativeSelect value={data.bundesland} onChange={(e) => upd("bundesland", e.target.value)} className="max-w-sm">
              <option value="">Bitte wählen</option>
              {BUNDESLAENDER.map((b) => <option key={b} value={b}>{b}</option>)}
            </NativeSelect>
          </div>

          {/* USt-IdNr. */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-center">
            <label className="text-sm font-medium text-gray-700 text-right">USt-IdNr.</label>
            <Input value={data.vatId} onChange={(e) => upd("vatId", e.target.value)} placeholder="DE..." className="max-w-sm" />
          </div>

          {/* Steuernummer */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-center">
            <label className="text-sm font-medium text-gray-700 text-right">Steuernummer</label>
            <Input value={data.taxId} onChange={(e) => upd("taxId", e.target.value)} placeholder="z.B. 211/277/40167" className="max-w-sm" />
          </div>

          {/* Besteuerung */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-start">
            <label className="text-sm font-medium text-gray-700 pt-1 text-right">Besteuerung</label>
            <div className="space-y-2">
              <Radio name="besteuerung" value="ist" checked={data.besteuerung === "ist"} onChange={() => upd("besteuerung", "ist")}
                label="USt wird erst mit Zahlungseingang abgeführt (Ist-Versteuerung)" />
              <Radio name="besteuerung" value="soll" checked={data.besteuerung === "soll"} onChange={() => upd("besteuerung", "soll")}
                label="USt wird sofort mit Rechnungsstellung abgeführt (Soll-Versteuerung)" />
            </div>
          </div>

          {/* Steuerliche Meldungen */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-start">
            <label className="text-sm font-medium text-gray-700 pt-1 text-right">Steuerliche Meldungen</label>
            <p className="text-xs text-gray-500">
              Die Einstellungen zur Umsatzsteuer-Voranmeldung und der Zusammenfassenden Meldung legen Sie <strong>direkt in den Einstellungen für steuerliche Meldungen</strong> fest.
            </p>
          </div>

          {/* Umsatzsteuer EU-Ausland */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-start">
            <label className="text-sm font-medium text-gray-700 pt-1 text-right">Umsatzsteuer bei Privatpersonen im EU-Ausland</label>
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Seit dem 01.07.2021 müssen Sie entscheiden, welche Umsatzsteuer-Sätze für Belege an Privatpersonen ins EU-Ausland angewandt werden sollen.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-800">
                  Unterhalb einer <strong>Umsatzschwelle von 10.000 €</strong> als <strong>Summe aller Umsätze</strong> in EU-Zielländer besteht eine Wahlmöglichkeit, darüber muss stets die Umsatzsteuer des EU-Ziellands angewandt werden.
                </p>
              </div>
              <div className="space-y-3">
                <Radio name="euUmsatzsteuer" value="deutsch" checked={data.euUmsatzsteuer === "deutsch"} onChange={() => upd("euUmsatzsteuer", "deutsch")}
                  label="Deutsche Umsatzsteuer"
                  desc="Umsätze werden automatisch in der Umsatzsteuer-Zahllast (ELSTER) berücksichtigt." />
                <Radio name="euUmsatzsteuer" value="eu-zielland" checked={data.euUmsatzsteuer === "eu-zielland"} onChange={() => upd("euUmsatzsteuer", "eu-zielland")}
                  label="EU-Zielland-Steuer"
                  desc="Umsätze müssen entweder manuell beim Bundeszentralamt für Steuern durch das One-Stop-Shop-Verfahren oder individuell im Zielland gemeldet werden." />
              </div>
            </div>
          </div>

          {/* Nullsteuer Photovoltaik */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-start">
            <label className="text-sm font-medium text-gray-700 pt-1 text-right">Nullsteuer bei Photovoltaikanlagen</label>
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Seit dem <strong>01.01.2023</strong> gilt mit dem Jahressteuergesetz 2022 eine ermäßigte Steuer von 0 % auf Umsätze durch Produkte und Services mit Photovoltaikanlagen. Für diese ist eine gesonderte Buchungskategorie bei der <strong>Belegerstellung</strong> erforderlich.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-800">
                  Betrifft Umsätze nach §12 Abs. 3 UStG.
                </p>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={data.pvNullsteuer} onChange={(e) => upd("pvNullsteuer", e.target.checked)}
                  className="h-4 w-4 accent-[#354360] rounded" />
                <span className="text-sm text-gray-700">Ja, Buchungskategorie &quot;Photovoltaikanlagen&quot; anzeigen.</span>
              </label>
            </div>
          </div>

          <div className="border-t my-6" />

          {/* Kontenrahmen */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-center">
            <label className="text-sm font-medium text-gray-700 text-right">Kontenrahmen</label>
            <NativeSelect value={data.kontenrahmen} onChange={(e) => upd("kontenrahmen", e.target.value)} className="max-w-sm">
              <option value="skr03">SKR 03</option>
              <option value="skr04">SKR 04</option>
            </NativeSelect>
          </div>

          {/* Steuerkanzlei */}
          <div className="grid grid-cols-[180px_1fr] gap-x-6 items-start">
            <label className="text-sm font-medium text-gray-700 pt-1 text-right">Steuerkanzlei</label>
            <div className="space-y-2">
              <Radio name="hatSteuerberater" value="nein" checked={!data.hatSteuerberater} onChange={() => upd("hatSteuerberater", false)}
                label="Ich habe keinen Steuerberater/keine Steuerberaterin" />
              <Radio name="hatSteuerberater" value="ja" checked={data.hatSteuerberater} onChange={() => upd("hatSteuerberater", true)}
                label="Ich habe einen Steuerberater/eine Steuerberaterin" />
            </div>
          </div>

          {/* Speichern */}
          <div className="flex justify-end pt-4">
            <Button onClick={save} disabled={saving} className="bg-[#9eb552] hover:bg-[#8da348] text-white px-6">
              {saving ? "Speichern..." : saved ? "Gespeichert!" : "Speichern"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Benutzer und Berechtigungen ───────────────────────────────

const BERECHTIGUNGEN = [
  "Belege, Kontakte & Artikel",
  "Finanzbuchhaltung",
  "Administration",
  "Lohnabrechnung",
];

const STB_BERECHTIGUNGEN = [
  "Belege",
  "Finanzbuchhaltung",
];

function BuchBenutzerSection() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState<"user" | "stb" | null>(null);
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", email: "", password: "", role: "MITARBEITER", berechtigungen: [...BERECHTIGUNGEN] });
  const [stbForm, setStbForm] = useState({ firstName: "", lastName: "", email: "", password: "", berechtigungen: [...STB_BERECHTIGUNGEN] });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const res = await fetch("/api/mitarbeiter");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  async function createUser() {
    setSaving(true);
    await fetch("/api/mitarbeiter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: addForm.firstName,
        lastName: addForm.lastName,
        email: addForm.email,
        password: addForm.password || "Passwort123",
        role: addForm.role,
        position: addForm.berechtigungen.join(", "),
      }),
    });
    setSaving(false);
    setAddOpen(null);
    setAddForm({ firstName: "", lastName: "", email: "", password: "", role: "MITARBEITER", berechtigungen: [...BERECHTIGUNGEN] });
    loadUsers();
  }

  async function createStb() {
    setSaving(true);
    await fetch("/api/mitarbeiter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: stbForm.firstName,
        lastName: stbForm.lastName,
        email: stbForm.email,
        password: stbForm.password || "Passwort123",
        role: "MITARBEITER",
        position: "Steuerberater – " + stbForm.berechtigungen.join(", "),
      }),
    });
    setSaving(false);
    setAddOpen(null);
    setStbForm({ firstName: "", lastName: "", email: "", password: "", berechtigungen: [...STB_BERECHTIGUNGEN] });
    loadUsers();
  }

  async function savePerms(userId: string) {
    await fetch(`/api/mitarbeiter/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: editPerms.join(", ") }),
    });
    setEditId(null);
    loadUsers();
  }

  async function deactivateUser(userId: string) {
    if (!confirm("Benutzer wirklich deaktivieren?")) return;
    await fetch(`/api/mitarbeiter/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    setMenuId(null);
    loadUsers();
  }

  function togglePerm(list: string[], perm: string): string[] {
    return list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm];
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#9eb552] border-t-transparent" /></div>;
  }

  const normalUsers = users.filter((u) => u.isActive !== false && !u.position?.startsWith("Steuerberater"));
  const stbUsers = users.filter((u) => u.isActive !== false && u.position?.startsWith("Steuerberater"));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">Benutzer und Berechtigungen</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddOpen("stb")} className="border-[#9eb552] text-[#9eb552] hover:bg-[#9eb552]/10">
            <Plus className="h-4 w-4 mr-1" />Steuerberater anlegen
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAddOpen("user")} className="border-[#9eb552] text-[#9eb552] hover:bg-[#9eb552]/10">
            <Plus className="h-4 w-4 mr-1" />Neuen Benutzer anlegen
          </Button>
        </div>
      </div>

      {/* Add User Dialog */}
      {addOpen === "user" && (
        <Card className="p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Neuen Benutzer anlegen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Vorname *</label>
              <Input value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nachname *</label>
              <Input value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">E-Mail *</label>
              <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Passwort</label>
              <Input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="Wird generiert wenn leer" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Berechtigungen</label>
              <div className="space-y-2">
                {BERECHTIGUNGEN.map((b) => (
                  <label key={b} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={addForm.berechtigungen.includes(b)}
                      onChange={() => setAddForm({ ...addForm, berechtigungen: togglePerm(addForm.berechtigungen, b) })}
                      className="h-4 w-4 accent-[#354360] rounded" />
                    <span className="text-sm text-gray-700">{b}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" onClick={createUser} disabled={saving || !addForm.firstName || !addForm.email}
              className="bg-[#9eb552] hover:bg-[#8da348] text-white">
              {saving ? "Speichern..." : "Benutzer anlegen"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(null)}>Abbrechen</Button>
          </div>
        </Card>
      )}

      {/* Add Steuerberater Dialog */}
      {addOpen === "stb" && (
        <Card className="p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Steuerberater anlegen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Vorname *</label>
              <Input value={stbForm.firstName} onChange={(e) => setStbForm({ ...stbForm, firstName: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nachname *</label>
              <Input value={stbForm.lastName} onChange={(e) => setStbForm({ ...stbForm, lastName: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">E-Mail *</label>
              <Input type="email" value={stbForm.email} onChange={(e) => setStbForm({ ...stbForm, email: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Passwort</label>
              <Input type="password" value={stbForm.password} onChange={(e) => setStbForm({ ...stbForm, password: e.target.value })} placeholder="Wird generiert wenn leer" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Berechtigungen</label>
              <div className="space-y-2">
                {STB_BERECHTIGUNGEN.map((b) => (
                  <label key={b} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={stbForm.berechtigungen.includes(b)}
                      onChange={() => setStbForm({ ...stbForm, berechtigungen: togglePerm(stbForm.berechtigungen, b) })}
                      className="h-4 w-4 accent-[#354360] rounded" />
                    <span className="text-sm text-gray-700">{b}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" onClick={createStb} disabled={saving || !stbForm.firstName || !stbForm.email}
              className="bg-[#9eb552] hover:bg-[#8da348] text-white">
              {saving ? "Speichern..." : "Steuerberater anlegen"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(null)}>Abbrechen</Button>
          </div>
        </Card>
      )}

      {/* Ansprechpartner */}
      <div className="mb-8">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Ansprechpartner</p>
        <div className="space-y-2">
          {normalUsers.length === 0 && <p className="text-sm text-gray-400 py-4">Keine Benutzer angelegt.</p>}
          {normalUsers.map((u) => {
            const perms = (u.position || "").split(",").map((s: string) => s.trim()).filter(Boolean);
            const isEditing = editId === u.id;
            return (
              <div key={u.id} className="border rounded-lg p-4 flex items-center gap-4 hover:bg-gray-50/50 relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-500 text-sm font-medium shrink-0">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{u.firstName} {u.lastName}</p>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {BERECHTIGUNGEN.map((b) => (
                        <label key={b} className="flex items-center gap-1.5 cursor-pointer text-xs">
                          <input type="checkbox" checked={editPerms.includes(b)}
                            onChange={() => setEditPerms(togglePerm(editPerms, b))}
                            className="h-3.5 w-3.5 accent-[#354360] rounded" />
                          <span className="text-gray-600">{b}</span>
                        </label>
                      ))}
                      <Button size="sm" className="h-6 text-[10px] px-2 bg-[#9eb552] hover:bg-[#8da348] text-white ml-2" onClick={() => savePerms(u.id)}>Speichern</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setEditId(null)}>Abbrechen</Button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {perms.length > 0 ? perms.map((p: string, i: number) => (
                        <span key={i}>{i > 0 && <span className="mx-1.5 text-gray-300">|</span>}{p}</span>
                      )) : <span className="text-gray-300">Keine Berechtigungen</span>}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <button onClick={() => setMenuId(menuId === u.id ? null : u.id)} className="p-1.5 hover:bg-gray-100 rounded-full">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" />
                    </svg>
                  </button>
                  {menuId === u.id && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border rounded-lg shadow-lg z-10 py-1">
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { setEditId(u.id); setEditPerms(perms); setMenuId(null); }}>
                        Berechtigungen bearbeiten
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => deactivateUser(u.id)}>
                        Deaktivieren
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Steuerberater-Zugänge */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Steuerberater-Zugänge</p>
        <div className="space-y-2">
          {stbUsers.length === 0 && <p className="text-sm text-gray-400 py-4">Keine Steuerberater-Zugänge angelegt.</p>}
          {stbUsers.map((u) => {
            const permsRaw = (u.position || "").replace("Steuerberater – ", "");
            const perms = permsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
            return (
              <div key={u.id} className="border rounded-lg p-4 flex items-center gap-4 hover:bg-gray-50/50 relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-500 text-sm font-medium shrink-0">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {perms.length > 0 ? perms.join(", ") : "Keine Berechtigungen"}
                  </p>
                </div>
                <div className="relative">
                  <button onClick={() => setMenuId(menuId === u.id ? null : u.id)} className="p-1.5 hover:bg-gray-100 rounded-full">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" />
                    </svg>
                  </button>
                  {menuId === u.id && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border rounded-lg shadow-lg z-10 py-1">
                      <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => deactivateUser(u.id)}>
                        Deaktivieren
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Mein Steuerberater ────────────────────────────────────────

const KANZLEI_OPTIONS = [
  {
    value: "keine",
    label: "Ich nutze keine direkte Anbindung.",
    desc: "Sie können die Beleg- und/oder Buchhaltungsdaten (DATEV-Format) im Bereich Export herunterladen.",
  },
  {
    value: "datev",
    label: "DATEV-Datenservices",
    desc: "Vor der Aktivierung muss Ihre Steuerkanzlei Ihnen in DATEV die Rechte freischalten.",
  },
  {
    value: "addison",
    label: "ADDISON OneClick",
    desc: "Bitte besprechen Sie die Anmeldung bei ADDISON mit Ihrer Steuerkanzlei.",
  },
  {
    value: "agenda",
    label: "Agenda Connect",
    desc: "Bitte besprechen Sie die Anmeldung bei Agenda mit Ihrer Steuerkanzlei.",
  },
] as const;

function BuchSteuerberaterSection() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const [anbindung, setAnbindung] = useState("keine");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAllowed, setIsAllowed] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/company").then((r) => r.json()),
      userId ? fetch(`/api/mitarbeiter/${userId}`).then((r) => r.ok ? r.json() : null) : Promise.resolve(null),
    ]).then(([company, user]) => {
      if (company?.kanzleiAnbindung) setAnbindung(company.kanzleiAnbindung);
      const pos = user?.position || "";
      const allowed = userRole === "ADMIN" || pos.includes("Steuerberater") || pos.includes("Finanzbuchhaltung");
      setIsAllowed(allowed);
      setLoading(false);
    });
  }, [userId, userRole]);

  async function save() {
    setSaving(true);
    await fetch("/api/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kanzleiAnbindung: anbindung }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#9eb552] border-t-transparent" /></div>;
  }

  if (!isAllowed) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Mein Steuerberater</h2>
        <p className="text-sm text-gray-500">Sie haben keine Berechtigung, diese Seite aufzurufen. Nur Geschäftsführer, Buchhaltung und Steuerberater haben Zugriff.</p>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Mein Steuerberater</h2>

      {/* Steuerberater in der Benutzerverwaltung */}
      <Card className="p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Steuerberater in der Benutzerverwaltung</h3>
        <p className="text-sm text-gray-600 mb-4">
          In der Benutzerverwaltung können Sie weitere Steuerberater einladen oder auch die aktuelle Zusammenarbeit beenden.
        </p>
        <button
          onClick={() => {
            const tab = document.querySelector('[data-state="active"][role="tabpanel"]');
            if (tab) {
              const parent = tab.closest("[data-state]");
              if (parent) {
                const benutzerTrigger = document.querySelector('[value="benutzer"]') as HTMLElement | null;
                benutzerTrigger?.click?.();
              }
            }
          }}
          className="text-sm font-medium text-[#354360] uppercase tracking-wide hover:text-[#212f46]"
        >
          Zur Benutzerverwaltung
        </button>
      </Card>

      {/* Anbindung Kanzleisoftware */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Anbindung Kanzleisoftware</h3>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Mit folgenden Schnittstellen können Sie Ihre Buchhaltungsdaten an Ihre Steuerkanzlei übertragen.
        </p>

        <div className="space-y-4">
          {KANZLEI_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="radio"
                name="kanzleiAnbindung"
                value={opt.value}
                checked={anbindung === opt.value}
                onChange={() => setAnbindung(opt.value)}
                className="mt-0.5 h-4 w-4 accent-[#354360]"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 group-hover:text-[#354360]">{opt.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end pt-6">
          <Button onClick={save} disabled={saving} className="bg-[#9eb552] hover:bg-[#8da348] text-white px-6">
            {saving ? "Speichern..." : saved ? "Gespeichert!" : "Speichern"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
