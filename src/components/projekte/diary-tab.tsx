"use client";

import { useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

interface Props {
  project: any;
  onUpdate: () => void;
}

export function DiaryTab({ project, onUpdate }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/projekte/${project.id}/eintraege`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        content: fd.get("content"),
        date: fd.get("date") || undefined,
      }),
    });
    setDialogOpen(false);
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bautagebuch</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" />Neuer Eintrag</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neuer Tagebucheintrag</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <Input name="title" required placeholder="z.B. Dachlatten montiert" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <Textarea name="content" required rows={4} placeholder="Was wurde heute gemacht?" />
              </div>
              <Button type="submit" className="w-full">Eintrag speichern</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {project.entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Noch keine Einträge im Bautagebuch
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {project.entries.map((entry: any) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{entry.title}</h4>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{entry.content}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-400 shrink-0 ml-4">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(entry.date)}
                  </div>
                </div>
                {entry.attachments?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {entry.attachments.map((att: any) => (
                      <a key={att.id} href={att.fileUrl} target="_blank" className="text-xs text-blue-600 hover:underline bg-blue-50 rounded px-2 py-1">
                        {att.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
