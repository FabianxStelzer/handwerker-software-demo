"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, User, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

interface ActiveEntry {
  id: string;
  userId: string;
  startTime: string;
  project: { id: string; projectNumber: string; name: string } | null;
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  position: string | null;
  phone: string | null;
  isActive: boolean;
  avatarUrl: string | null;
}

function roleTranslationKey(role: string): TranslationKey | null {
  if (role === "ADMIN" || role === "BAULEITER" || role === "MITARBEITER") {
    return `role.${role}` as TranslationKey;
  }
  return null;
}

export default function MitarbeiterPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const currentRole = (session?.user as { role?: string })?.role;
  const isAdmin = currentRole === "ADMIN";

  const [users, setUsers] = useState<UserInfo[]>([]);
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [usersRes, activeRes] = await Promise.all([
      fetch("/api/mitarbeiter"),
      fetch("/api/zeiterfassung?active=true"),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (activeRes.ok) setActiveEntries(await activeRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/mitarbeiter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setDialogOpen(false);
    load();
  }

  function getActiveEntry(userId: string): ActiveEntry | undefined {
    return activeEntries.find((e) => e.userId === userId);
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const activeCount = users.filter((u) => u.isActive && getActiveEntry(u.id)).length;
  const totalActive = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("mitarbeiter.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {`${totalActive} ${t("common.aktiv")} · ${activeCount} ${t("mitarbeiter.eingestempelt")}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("common.aktualisieren")}
          </Button>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />{t("mitarbeiter.neuerMitarbeiter")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("mitarbeiter.neuerMitarbeiter")}</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.vorname")}</label>
                      <Input name="firstName" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.nachname")}</label>
                      <Input name="lastName" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.email")}</label>
                    <Input name="email" type="email" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.passwort")}</label>
                    <Input name="password" type="password" defaultValue="changeme123" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.rolle")}</label>
                      <NativeSelect name="role" defaultValue="MITARBEITER">
                        <option value="ADMIN">{t("role.ADMIN")}</option>
                        <option value="BAULEITER">{t("role.BAULEITER")}</option>
                        <option value="MITARBEITER">{t("role.MITARBEITER")}</option>
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.position")}</label>
                      <Input name="position" placeholder={t("mitarbeiter.positionPlaceholder")} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.telefon")}</label>
                    <Input name="phone" />
                  </div>
                  <Button type="submit" className="w-full">{t("mitarbeiter.mitarbeiterAnlegen")}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isAdmin && activeCount > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("mitarbeiter.eingestempelt")} ({activeCount})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {users.filter((u) => getActiveEntry(u.id)).map((u) => {
                const entry = getActiveEntry(u.id)!;
                return (
                  <div key={u.id} className="flex items-center gap-3 rounded-lg bg-white p-3 border border-green-200">
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-500">
                        {`${t("mitarbeiter.seit")} ${entry.startTime} ${t("common.uhr")}`}
                        {entry.project && (
                          <> · <span className="text-blue-600">{entry.project.name}</span></>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const entry = getActiveEntry(user.id);
          const isWorking = !!entry;
          const rk = roleTranslationKey(user.role);

          return (
            <Link key={user.id} href={`/mitarbeiter/${user.id}`}>
              <Card className={`hover:shadow-md transition-shadow cursor-pointer ${!user.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 shrink-0">
                        <User className="h-6 w-6" />
                      </div>
                      {user.isActive && (
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${isWorking ? "bg-green-500" : "bg-gray-300"}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500">{user.position || "–"}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                          {rk ? t(rk) : user.role}
                        </Badge>
                        {!user.isActive && <Badge variant="destructive">{t("mitarbeiter.deaktiviert")}</Badge>}
                        {isWorking && (
                          <Badge className="bg-green-100 text-green-700 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {`${t("mitarbeiter.arbeitSeit")} ${entry.startTime}`}
                          </Badge>
                        )}
                        {user.isActive && !isWorking && (
                          <Badge className="bg-gray-100 text-gray-500 gap-1">
                            <XCircle className="h-3 w-3" />
                            {t("zeit.nichtEingestempelt")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
