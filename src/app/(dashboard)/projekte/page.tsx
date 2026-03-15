"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Table, Columns3, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  projectNumber: string;
  name: string;
  description: string | null;
  status: string;
  customerName: string;
  startDate: string | null;
  endDate: string | null;
  _count: { tasks: number; entries: number; documents: number };
}

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" | "destructive"; color: string }> = {
  PLANUNG: { label: "Planung", variant: "secondary", color: "bg-gray-100 border-gray-300" },
  AKTIV: { label: "Aktiv", variant: "default", color: "bg-blue-50 border-blue-300" },
  PAUSIERT: { label: "Pausiert", variant: "warning", color: "bg-yellow-50 border-yellow-300" },
  ABGESCHLOSSEN: { label: "Abgeschlossen", variant: "success", color: "bg-green-50 border-green-300" },
  STORNIERT: { label: "Storniert", variant: "destructive", color: "bg-red-50 border-red-300" },
};

type ViewMode = "table" | "kanban" | "grid";

export default function ProjektePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; firstName: string; lastName: string; company: string | null; type: string }>>([]);
  const [view, setView] = useState<ViewMode>("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/projekte").then((r) => r.json()),
      fetch("/api/kunden").then((r) => r.json()),
    ]).then(([p, c]) => {
      setProjects(p);
      setCustomers(c);
      setLoading(false);
    });
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    await fetch("/api/projekte", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setDialogOpen(false);
    const res = await fetch("/api/projekte");
    setProjects(await res.json());
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const kanbanStatuses = ["PLANUNG", "AKTIV", "PAUSIERT", "ABGESCHLOSSEN"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projekte</h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length} Projekte</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            {([["table", Table], ["kanban", Columns3], ["grid", LayoutGrid]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={cn("p-2 rounded-md", view === mode ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600")}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" />Neues Projekt</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Neues Projekt</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
                  <NativeSelect name="customerId" required>
                    <option value="">Kunde wählen...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.type === "GESCHAEFT" && c.company ? c.company : `${c.firstName} ${c.lastName}`}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Projektname (optional)</label>
                  <Input name="name" placeholder="Wird automatisch generiert" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                  <Textarea name="description" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                    <Input name="startDate" type="date" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
                    <Input name="endDate" type="date" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Baustellenadresse</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input name="siteStreet" placeholder="Straße" className="col-span-2" />
                    <Input name="siteZip" placeholder="PLZ" />
                  </div>
                  <Input name="siteCity" placeholder="Ort" className="mt-2" />
                </div>
                <Button type="submit" className="w-full">Projekt anlegen</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {view === "table" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
                  <th className="px-4 py-3">Nr.</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Kunde</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Zeitraum</th>
                  <th className="px-4 py-3">Aufgaben</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/projekte/${p.id}`} className="text-sm text-blue-600 hover:underline font-mono">
                        {p.projectNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/projekte/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.customerName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusConfig[p.status]?.variant || "secondary"}>
                        {statusConfig[p.status]?.label || p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {p.startDate && p.endDate
                        ? `${formatDate(p.startDate)} – ${formatDate(p.endDate)}`
                        : p.startDate ? `Ab ${formatDate(p.startDate)}` : "–"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p._count.tasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanStatuses.map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{statusConfig[status]?.label}</h3>
                <Badge variant="secondary">{projects.filter((p) => p.status === status).length}</Badge>
              </div>
              <div className="space-y-2">
                {projects.filter((p) => p.status === status).map((p) => (
                  <Link key={p.id} href={`/projekte/${p.id}`}>
                    <Card className={cn("hover:shadow-md transition-shadow cursor-pointer border-l-4", statusConfig[status]?.color)}>
                      <CardContent className="p-3">
                        <p className="text-xs font-mono text-gray-400">{p.projectNumber}</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{p.customerName}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} href={`/projekte/${p.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-mono text-gray-400">{p.projectNumber}</span>
                    <Badge variant={statusConfig[p.status]?.variant || "secondary"}>
                      {statusConfig[p.status]?.label || p.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{p.customerName}</p>
                  {p.description && (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{p.description}</p>
                  )}
                  <div className="flex gap-3 mt-4 text-xs text-gray-400">
                    <span>{p._count.tasks} Aufgaben</span>
                    <span>{p._count.entries} Einträge</span>
                    <span>{p._count.documents} Dokumente</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
