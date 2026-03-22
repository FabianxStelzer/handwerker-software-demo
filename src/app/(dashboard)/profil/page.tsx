"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User, Lock, Camera, Save, CheckCircle2, Globe, Mail, Phone, MapPin, Briefcase,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { languageNames, type Language, type TranslationKey } from "@/lib/i18n/translations";

interface UserProfile {
  id: string; email: string; firstName: string; lastName: string;
  phone: string | null; position: string | null; avatarUrl: string | null;
  street: string | null; zip: string | null; city: string | null;
  role: string; language: string;
}

const roleKeys: Record<string, TranslationKey> = { ADMIN: "role.ADMIN", BAULEITER: "role.BAULEITER", MITARBEITER: "role.MITARBEITER" };
const flags: Record<string, string> = { de: "🇩🇪", en: "🇬🇧", cs: "🇨🇿", tr: "🇹🇷", pl: "🇵🇱", ru: "🇷🇺", uk: "🇺🇦", ro: "🇷🇴", hr: "🇭🇷", ar: "🇸🇦" };

export default function ProfilPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const { language, setLanguage, t } = useTranslation();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", neu: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/mitarbeiter/${userId}`);
      if (res.ok) setProfile(await res.json());
    } catch { /* */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!profile || !userId) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/mitarbeiter/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.firstName, lastName: profile.lastName,
          phone: profile.phone, position: profile.position,
          street: profile.street, zip: profile.zip, city: profile.city,
        }),
      });
      if (res.ok) { setProfile(await res.json()); setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else { const e = await res.json().catch(() => ({})); setError(e.error || t("common.fehler")); }
    } catch { setError(t("common.netzwerkfehler")); }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("userId", userId);
      const res = await fetch("/api/profil/avatar", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setProfile(p => p ? { ...p, avatarUrl: data.avatarUrl } : p);
      }
    } catch { /* */ }
    setAvatarUploading(false);
    e.target.value = "";
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(""); setPasswordSaved(false);
    if (passwordForm.neu !== passwordForm.confirm) { setPasswordError(t("profil.passwortNichtGleich")); return; }
    if (passwordForm.neu.length < 6) { setPasswordError(t("profil.mindestens6")); return; }
    const res = await fetch(`/api/mitarbeiter/${userId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordForm.neu }),
    });
    if (res.ok) { setPasswordSaved(true); setPasswordForm({ current: "", neu: "", confirm: "" }); setTimeout(() => setPasswordSaved(false), 3000); }
    else setPasswordError(t("profil.fehlerAendern"));
  };

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    if (userId) {
      await fetch(`/api/mitarbeiter/${userId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9eb552]" /></div>;
  if (!profile) return <div className="text-center py-12 text-gray-500">{t("profil.nichtGeladen")}</div>;

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("profil.title")}</h1>

      {/* Header Card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="h-24" style={{ background: "linear-gradient(135deg, #212f46 0%, #354360 100%)" }} />
        <CardContent className="relative px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12">
            <div className="relative group">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-[#9eb552] flex items-center justify-center text-white text-2xl font-bold">{initials}</div>
              )}
              <button onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-6 w-6 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              {avatarUploading && <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" /></div>}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-[#9eb552]/15 text-[#354360] text-xs">{roleKeys[profile.role] ? t(roleKeys[profile.role]) : profile.role}</Badge>
                {profile.position && <span className="text-sm text-gray-500">{profile.position}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Persönliche Daten */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-[#9eb552]" />{t("profil.persoenlicheDaten")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-500">{t("common.vorname")}</label><Input value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} className="mt-1" /></div>
              <div><label className="text-xs font-medium text-gray-500">{t("common.nachname")}</label><Input value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} className="mt-1" /></div>
            </div>
            <div><label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" />{t("common.email")}</label><Input value={profile.email} disabled className="mt-1 bg-gray-50" /></div>
            <div><label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" />{t("common.telefon")}</label><Input value={profile.phone || ""} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Briefcase className="h-3 w-3" />{t("common.position")}</label><Input value={profile.position || ""} onChange={e => setProfile({ ...profile, position: e.target.value })} className="mt-1" /></div>
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{t("common.adresse")}</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Input value={profile.street || ""} onChange={e => setProfile({ ...profile, street: e.target.value })} placeholder={t("common.strasse")} className="col-span-3" />
                <Input value={profile.zip || ""} onChange={e => setProfile({ ...profile, zip: e.target.value })} placeholder={t("common.plz")} />
                <Input value={profile.city || ""} onChange={e => setProfile({ ...profile, city: e.target.value })} placeholder={t("common.stadt")} className="col-span-2" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saved ? <><CheckCircle2 className="h-4 w-4 mr-2" />{t("common.gespeichert")}</> : <><Save className="h-4 w-4 mr-2" />{saving ? t("profil.speichert") : t("common.speichern")}</>}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Passwort */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-[#9eb552]" />{t("profil.passwortAendern")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <Input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} placeholder={t("profil.aktuellesPasswort")} />
                <Input type="password" value={passwordForm.neu} onChange={e => setPasswordForm({ ...passwordForm, neu: e.target.value })} placeholder={t("profil.neuesPasswort")} minLength={6} required />
                <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} placeholder={t("profil.passwortBestaetigen")} required />
                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                <Button type="submit" variant="outline" className="w-full">
                  {passwordSaved ? <><CheckCircle2 className="h-4 w-4 mr-2" />{t("profil.geaendert")}</> : <><Lock className="h-4 w-4 mr-2" />{t("profil.passwortAendern")}</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Sprache */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-[#9eb552]" />{t("settings.sprache")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                  <button key={code} onClick={() => handleLanguageChange(code)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left text-sm ${
                      language === code ? "border-[#9eb552] bg-[#9eb552]/10" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <span className="text-lg">{flags[code] || "🌐"}</span>
                    <span className={language === code ? "font-medium text-[#354360]" : "text-gray-700"}>{name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
