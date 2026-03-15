"use client";

import { useState } from "react";
import { Plus, CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

interface Props {
  project: any;
  onUpdate: () => void;
}

const priorityConfig: Record<string, { label: string; variant: "destructive" | "warning" | "secondary" }> = {
  HOCH: { label: "Hoch", variant: "destructive" },
  MITTEL: { label: "Mittel", variant: "warning" },
  NIEDRIG: { label: "Niedrig", variant: "secondary" },
};

const statusIcons: Record<string, typeof Circle> = {
  OFFEN: Circle,
  IN_BEARBEITUNG: Clock,
  ERLEDIGT: CheckCircle2,
};

export function TasksTab({ project, onUpdate }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/projekte/${project.id}/aufgaben`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setDialogOpen(false);
    onUpdate();
  }

  async function toggleStatus(task: any) {
    const next = task.status === "OFFEN" ? "IN_BEARBEITUNG" : task.status === "IN_BEARBEITUNG" ? "ERLEDIGT" : "OFFEN";
    await fetch(`/api/projekte/${project.id}/aufgaben`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...task, status: next }),
    });
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Aufgaben</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Neue Aufgabe</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neue Aufgabe</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <Input name="title" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <Textarea name="description" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorität</label>
                  <NativeSelect name="priority" defaultValue="MITTEL">
                    <option value="HOCH">Hoch</option>
                    <option value="MITTEL">Mittel</option>
                    <option value="NIEDRIG">Niedrig</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fällig am</label>
                  <Input name="dueDate" type="date" />
                </div>
              </div>
              <Button type="submit" className="w-full">Aufgabe anlegen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {project.tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">Keine Aufgaben</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {project.tasks.map((task: any) => {
            const Icon = statusIcons[task.status] || Circle;
            const pc = priorityConfig[task.priority];
            return (
              <Card key={task.id} className={task.status === "ERLEDIGT" ? "opacity-60" : ""}>
                <CardContent className="p-4 flex items-center gap-4">
                  <button onClick={() => toggleStatus(task)} className="shrink-0">
                    <Icon className={`h-5 w-5 ${task.status === "ERLEDIGT" ? "text-green-500" : task.status === "IN_BEARBEITUNG" ? "text-blue-500" : "text-gray-300"}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === "ERLEDIGT" ? "line-through text-gray-400" : "text-gray-900"}`}>{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.dueDate && (
                      <span className="text-xs text-gray-400">{formatDate(task.dueDate)}</span>
                    )}
                    <Badge variant={pc?.variant || "secondary"} className="text-xs">{pc?.label || task.priority}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
