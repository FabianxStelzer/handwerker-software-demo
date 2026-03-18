"use client";

import { useState, useRef } from "react";
import {
  FileImage,
  Folder,
  FolderOpen,
  Upload,
  Trash2,
  Plus,
  ArrowLeft,
  FolderPlus,
  Download,
} from "lucide-react";
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

  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    setOpenFolder(name);
    setShowNewFolder(false);
    setNewFolderName("");
  }

  async function handleUpload() {
    if (!selectedFile || !openFolder) return;
    setUploading(true);

    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("folder", openFolder);
    if (uploadTitle.trim()) {
      fd.append("title", uploadTitle.trim());
    }
    await fetch(`/api/projekte/${project.id}/bauplaene`, { method: "POST", body: fd });

    setUploading(false);
    setShowUpload(false);
    setUploadTitle("");
    setSelectedFile(null);
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

  const folderBlueprints = openFolder
    ? blueprints.filter((b: any) => b.folder === openFolder)
    : [];

  // Ordner-Ansicht (Hauptseite)
  if (!openFolder) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Baupläne</h3>
          <Button size="sm" className="gap-1.5" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="h-4 w-4" />
            Neuer Ordner
          </Button>
        </div>

        {showNewFolder && (
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Ordnername</label>
              <div className="flex gap-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="z.B. Erdgeschoss, Dachgeschoss, Elektro"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                />
                <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                  Anlegen
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {folders.length === 0 && !showNewFolder ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-400">
              <Folder className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Noch keine Ordner vorhanden</p>
              <p className="text-xs mt-1">Lege einen Ordner an, um Baupläne hochzuladen</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 gap-1.5"
                onClick={() => setShowNewFolder(true)}
              >
                <FolderPlus className="h-4 w-4" />
                Ersten Ordner anlegen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {folders.map((f) => {
              const count = blueprints.filter((b: any) => b.folder === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setOpenFolder(f)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all text-left group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:bg-amber-100 transition-colors shrink-0">
                    <Folder className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 truncate">{f}</p>
                    <p className="text-xs text-gray-400">
                      {count} {count === 1 ? "Bauplan" : "Baupläne"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Ordner-Innenansicht
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setOpenFolder(null); setShowUpload(false); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">{openFolder}</h3>
            <Badge variant="secondary" className="text-xs">
              {folderBlueprints.length} {folderBlueprints.length === 1 ? "Datei" : "Dateien"}
            </Badge>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowUpload(!showUpload)}>
          <Upload className="h-4 w-4" />
          Bauplan hochladen
        </Button>
      </div>

      {showUpload && (
        <Card className="border-blue-200">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Titel des Bauplans</label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="z.B. Grundriss EG, Elektroplan Küche"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Datei auswählen</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {selectedFile && (
              <p className="text-xs text-gray-500">
                Ausgewählt: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowUpload(false); setUploadTitle(""); setSelectedFile(null); }}
              >
                Abbrechen
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Wird hochgeladen...
                  </span>
                ) : (
                  "Hochladen"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {folderBlueprints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <FileImage className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Dieser Ordner ist noch leer</p>
            <p className="text-xs mt-1">Lade den ersten Bauplan hoch</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-1.5"
              onClick={() => setShowUpload(true)}
            >
              <Upload className="h-4 w-4" />
              Bauplan hochladen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {folderBlueprints.map((bp: any) => (
            <div
              key={bp.id}
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 group"
            >
              <a href={bp.fileUrl} target="_blank" className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0 hover:bg-indigo-100 transition-colors">
                <FileImage className="h-6 w-6" />
              </a>
              <a href={bp.fileUrl} target="_blank" className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
                  {bp.name}
                </p>
                <p className="text-xs text-gray-400">{formatDate(bp.createdAt)}</p>
              </a>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={bp.fileUrl}
                  target="_blank"
                  className="p-2 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Öffnen"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleDelete(bp.id)}
                  className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
