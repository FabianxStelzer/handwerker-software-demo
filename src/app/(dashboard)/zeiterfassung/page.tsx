"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

function calcHours(start: string, end: string, breakMin: number): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm) - breakMin;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${String(m).padStart(2, "0")} Std`;
}

export default function ZeiterfassungPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/zeiterfassung?date=${selectedDate}`)
      .then((r) => r.json())
      .then(setEntries);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/mitarbeiter").then((r) => r.json()),
      fetch("/api/projekte").then((r) => r.json()),
    ]).then(([u, p]) => {
      setUsers(u);
      setProjects(p);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [selectedDate]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/zeiterfassung", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(fd.entries()),
        date: selectedDate,
      }),
    });
    setDialogOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    await fetch("/api/zeiterfassung", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zeiterfassung</h1>
          <p className="text-sm text-gray-500 mt-1">Arbeitszeiten der Mitarbeiter erfassen</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" />Eintrag</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Arbeitszeit erfassen – {formatDate(selectedDate)}</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter</label>
                  <NativeSelect name="userId" required>
                    <option value="">Mitarbeiter wählen...</option>
                    {users.filter((u: any) => u.isActive).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Projekt</label>
                  <NativeSelect name="projectId" required>
                    <option value="">Projekt wählen...</option>
                    {projects.filter((p: any) => p.status === "AKTIV").map((p: any) => (
                      <option key={p.id} value={p.id}>{p.projectNumber} – {p.name}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beginn</label>
                    <Input name="startTime" type="time" defaultValue="07:00" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ende</label>
                    <Input name="endTime" type="time" defaultValue="16:00" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pause (Min)</label>
                    <Input name="breakMin" type="number" defaultValue="30" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                  <Input name="notes" placeholder="Optional" />
                </div>
                <Button type="submit" className="w-full">Eintragen</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {formatDate(selectedDate)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Keine Einträge für diesen Tag</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="px-4 py-3">Mitarbeiter</th>
                    <th className="px-4 py-3">Projekt</th>
                    <th className="px-4 py-3">Beginn</th>
                    <th className="px-4 py-3">Ende</th>
                    <th className="px-4 py-3">Pause</th>
                    <th className="px-4 py-3">Stunden</th>
                    <th className="px-4 py-3">Notizen</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e: any) => (
                    <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.user.firstName} {e.user.lastName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{e.project.projectNumber}</td>
                      <td className="px-4 py-3 text-sm">{e.startTime}</td>
                      <td className="px-4 py-3 text-sm">{e.endTime}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{e.breakMin} Min</td>
                      <td className="px-4 py-3 text-sm font-medium">{calcHours(e.startTime, e.endTime, e.breakMin)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{e.notes || "–"}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
