"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Users, FileText, Receipt, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardData {
  customerCount: number;
  activeProjects: number;
  openOrders: number;
  unpaidInvoices: number;
  unpaidTotal: number;
  recentProjects: Array<{
    id: string;
    projectNumber: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    customerName: string;
  }>;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const empty: DashboardData = {
      customerCount: 0,
      activeProjects: 0,
      openOrders: 0,
      unpaidInvoices: 0,
      unpaidTotal: 0,
      recentProjects: [],
    };

    fetch("/api/dashboard")
      .then(async (r) => {
        if (!r.ok) return empty;
        try {
          const json = await r.json();
          return json && typeof json.customerCount === "number" && Array.isArray(json.recentProjects)
            ? json
            : empty;
        } catch {
          return empty;
        }
      })
      .then(setData)
      .catch(() => setData(empty));
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const stats = [
    { label: "Kunden", value: data.customerCount, icon: Users, color: "text-blue-600 bg-blue-100" },
    { label: "Aktive Projekte", value: data.activeProjects, icon: FolderKanban, color: "text-green-600 bg-green-100" },
    { label: "Offene Aufträge", value: data.openOrders, icon: FileText, color: "text-yellow-600 bg-yellow-100" },
    { label: "Unbezahlte Rechnungen", value: data.unpaidInvoices, icon: Receipt, color: "text-red-600 bg-red-100" },
  ];

  const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" }> = {
    PLANUNG: { label: "Planung", variant: "secondary" },
    AKTIV: { label: "Aktiv", variant: "default" },
    PAUSIERT: { label: "Pausiert", variant: "warning" },
    ABGESCHLOSSEN: { label: "Abgeschlossen", variant: "success" },
  };

  const isEmpty = data.customerCount === 0 && data.recentProjects.length === 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Überblick über Ihr Unternehmen</p>
        </div>

        {isEmpty && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">Keine Daten geladen</p>
            <p className="mt-1">Führen Sie <code className="bg-amber-100 px-1 rounded">npm run db:seed:admin</code> aus, um Demo-Daten zu erstellen.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {data.unpaidTotal > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-red-600 shrink-0" />
              <div>
                <p className="font-semibold text-red-800">Offene Forderungen</p>
                <p className="text-sm text-red-600">
                  {formatCurrency(data.unpaidTotal)} in unbezahlten Rechnungen
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Aktuelle Projekte
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentProjects.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Keine Projekte vorhanden</p>
            ) : (
              <div className="space-y-3">
                {data.recentProjects.map((project) => (
                  <a
                    key={project.id}
                    href={`/projekte/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500">
                        {project.projectNumber} · {project.customerName}
                      </p>
                    </div>
                    <Badge variant={statusMap[project.status]?.variant || "secondary"}>
                      {statusMap[project.status]?.label || project.status}
                    </Badge>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
