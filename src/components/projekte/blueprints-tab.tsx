"use client";

import { useState, useRef } from "react";
import { FileImage, FolderOpen, Upload, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

interface Props {
  project: any;
  onUpdate: () => void;
}

export function BlueprintsTab({ project, onUpdate }: Props) {
  const blueprints = project.blueprints || [];
  const folders = [...new Set(blueprints.map((b: any) => b.folder))] as string[];
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState("Allgemein");
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      fd.append("folder", folder);
      await fetch(`/api/projekte/${project.id}/bauplaene`, { method: "POST", body: fd });
    }

    setUploading(false);
    setShowUpload(false);
    if (fileRef.current) fileRef.current.value = "";
    onUpdate();
  }

  async function handleDelete(id: string) {
    if (!confirm("Bauplan wirklich löschen?")) return;
    await fetch(`/api/projekte/${project.id}/bauplaene`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Baupläne</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setShowUpload(!showUpload)}>
          <Upload className="h-4 w-4" />
          Bauplan hochladen
        </Button>
      </div>

      {showUpload && (
        <Card className="border-blue-200">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ordner</label>
              <div className="flex gap-2">
                <Input
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="z.B. Erdgeschoss, Dachgeschoss"
                  className="max-w-xs"
                />
                {folders.filter((f) => f !== folder).map((f) => (
                  <Button key={f} variant="outline" size="sm" onClick={() => setFolder(f)}>
                    {f}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dateien auswählen</label>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf"
                onChange={(e) => handleUpload(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Wird hochgeladen...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {blueprints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FileImage className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Noch keine Baupläne hochgeladen</p>
            <p className="text-xs text-gray-400 mt-1">Lade PDF-, Bild- oder CAD-Dateien hoch</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {folders.map((f) => (
            <div key={f}>
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-4 w-4 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-700">{f}</h4>
                <Badge variant="secondary" className="text-xs">
                  {blueprints.filter((b: any) => b.folder === f).length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {blueprints.filter((b: any) => b.folder === f).map((bp: any) => (
                  <div key={bp.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 group">
                    <a href={bp.fileUrl} target="_blank" className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                        <FileImage className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{bp.name}</p>
                        <p className="text-xs text-gray-400">{formatDate(bp.createdAt)}</p>
                      </div>
                    </a>
                    <button
                      onClick={() => handleDelete(bp.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
