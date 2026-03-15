"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  project: any;
  onUpdate: () => void;
}

export function OverviewTab({ project, onUpdate }: Props) {
  const [form, setForm] = useState({
    name: project.name || "",
    description: project.description || "",
    status: project.status,
    siteStreet: project.siteStreet || "",
    siteZip: project.siteZip || "",
    siteCity: project.siteCity || "",
    startDate: project.startDate?.split("T")[0] || "",
    endDate: project.endDate?.split("T")[0] || "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/projekte/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    onUpdate();
    setSaving(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Projektdaten</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Projektname</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <NativeSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="PLANUNG">Planung</option>
              <option value="AKTIV">Aktiv</option>
              <option value="PAUSIERT">Pausiert</option>
              <option value="ABGESCHLOSSEN">Abgeschlossen</option>
              <option value="STORNIERT">Storniert</option>
            </NativeSelect>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Speichern..." : "Änderungen speichern"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Baustellenadresse</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Straße</label>
            <Input value={form.siteStreet} onChange={(e) => setForm({ ...form, siteStreet: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
              <Input value={form.siteZip} onChange={(e) => setForm({ ...form, siteZip: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
              <Input value={form.siteCity} onChange={(e) => setForm({ ...form, siteCity: e.target.value })} />
            </div>
          </div>
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Kunde</h4>
            <p className="text-sm text-gray-900">
              {project.customer.type === "GESCHAEFT" && project.customer.company
                ? project.customer.company
                : `${project.customer.firstName} ${project.customer.lastName}`}
            </p>
            {project.customer.email && <p className="text-sm text-gray-500">{project.customer.email}</p>}
            {project.customer.phone && <p className="text-sm text-gray-500">{project.customer.phone}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
