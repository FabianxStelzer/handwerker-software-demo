"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Key, RefreshCw, Send, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const LEXOFFICE_APP = "https://app.lexware.de";
const API_KEY_URL = "https://app.lexware.de/addons/public-api";

export default function LexofficePage() {
  const [status, setStatus] = useState<{ connected: boolean; message?: string; organizationName?: string } | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [localInvoices, setLocalInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const loadStatus = () => {
    fetch("/api/lexoffice")
      .then((r) => r.json())
      .then(setStatus);
  };

  const loadInvoices = () => {
    if (!status?.connected) return;
    setLoadingInvoices(true);
    fetch("/api/lexoffice/invoices")
      .then((r) => r.json())
      .then((data) => {
        const list = data?.content ?? data?.invoices ?? (Array.isArray(data) ? data : []);
        setInvoices(list);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoadingInvoices(false));
  };

  const loadLocalInvoices = () => {
    fetch("/api/rechnungen")
      .then((r) => r.json())
      .then(setLocalInvoices)
      .catch(() => setLocalInvoices([]));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (status?.connected) {
      loadInvoices();
    }
    loadLocalInvoices();
  }, [status?.connected]);

  const saveApiKey = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/lexoffice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setApiKeyInput("");
      loadStatus();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const syncToLexoffice = async (invoiceId: string) => {
    setSyncing(invoiceId);
    try {
      const res = await fetch("/api/lexoffice/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync fehlgeschlagen");
      alert(`Rechnung erfolgreich nach Lexoffice übertragen: ${data.voucherNumber ?? data.lexofficeId}`);
      loadInvoices();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSyncing(null);
    }
  };

  const statusLabels: Record<string, string> = {
    draft: "Entwurf",
    open: "Offen",
    paid: "Bezahlt",
    paidoff: "Bezahlt",
    voided: "Storniert",
    overdue: "Überfällig",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rechnungen">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lexoffice Integration</h1>
          <p className="text-sm text-gray-500">
            Rechnungen mit Lexoffice synchronisieren und verwalten
          </p>
        </div>
      </div>

      {/* Verbindung */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Verbindung
          </CardTitle>
          <p className="text-sm text-gray-500">
            API-Schlüssel unter{" "}
            <a
              href={API_KEY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              app.lexware.de/addons/public-api
            </a>{" "}
            erstellen
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {status && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-3 ${
                status.connected ? "bg-green-50 text-green-800" : "bg-gray-50 text-gray-600"
              }`}
            >
              {status.connected ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <X className="h-5 w-5 text-gray-400" />
              )}
              <span className="font-medium">
                {status.connected
                  ? `Verbunden mit ${status.organizationName ?? "Lexoffice"}`
                  : status.message ?? "Nicht verbunden"}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="API-Schlüssel einfügen"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="max-w-md"
            />
            <Button onClick={saveApiKey} disabled={saving}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </div>
          <a
            href={LEXOFFICE_APP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Lexoffice öffnen
          </a>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lokale Rechnungen → Sync nach Lexoffice */}
        <Card>
          <CardHeader>
            <CardTitle>Rechnungen → Lexoffice übertragen</CardTitle>
            <p className="text-sm text-gray-500">
              Rechnungen aus der Handwerker-Software nach Lexoffice senden
            </p>
          </CardHeader>
          <CardContent>
            {!status?.connected ? (
              <p className="text-sm text-gray-500">Bitte zuerst Lexoffice verbinden.</p>
            ) : localInvoices.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Rechnungen vorhanden.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {localInvoices.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">{inv.customerName}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => syncToLexoffice(inv.id)}
                      disabled={!!syncing}
                    >
                      {syncing === inv.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Sync
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lexoffice Rechnungen */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Rechnungen in Lexoffice</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadInvoices}
                disabled={!status?.connected || loadingInvoices}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loadingInvoices ? "animate-spin" : ""}`} />
                Aktualisieren
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!status?.connected ? (
              <p className="text-sm text-gray-500">Bitte zuerst Lexoffice verbinden.</p>
            ) : loadingInvoices ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Rechnungen in Lexoffice gefunden.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {invoices.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{inv.voucherNumber ?? inv.id}</p>
                      <p className="text-xs text-gray-500">{inv.contactName ?? "–"}</p>
                      {(inv.totalAmount != null) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {formatCurrency(inv.totalAmount)}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {statusLabels[inv.voucherStatus] ?? inv.voucherStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
