"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function BenachrichtigungenPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!userId) return;
    const res = await fetch(`/api/notifications?userId=${userId}`);
    if (res.ok) setNotifications(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [userId]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true, userId }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benachrichtigungen</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} ${t("benachrichtigungen.ungelesen")}` : t("benachrichtigungen.alleGelesen")}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />Alle als gelesen markieren
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t("benachrichtigungen.keine")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-colors ${!n.read ? "border-blue-200 bg-blue-50/30" : ""}`}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${!n.read ? "bg-blue-500" : "bg-gray-200"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {n.link && (
                    <Link href={n.link}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Öffnen">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                  {!n.read && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markRead(n.id)} title="Als gelesen markieren">
                      <CheckCheck className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
