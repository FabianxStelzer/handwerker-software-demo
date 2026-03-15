"use client";

import { useState } from "react";
import { FileText, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Props {
  project: any;
  onUpdate: () => void;
}

export function DocumentsTab({ project, onUpdate }: Props) {
  const docs = project.documents || [];
  const folders = [...new Set(docs.map((d: any) => d.folder))] as string[];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Dokumente</h3>
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Noch keine Dokumente hochgeladen
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {folders.map((folder) => (
            <div key={folder}>
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-4 w-4 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-700">{folder}</h4>
                <Badge variant="secondary" className="text-xs">{docs.filter((d: any) => d.folder === folder).length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {docs.filter((d: any) => d.folder === folder).map((doc: any) => (
                  <a
                    key={doc.id}
                    href={doc.fileUrl}
                    target="_blank"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: doc.color + "20", color: doc.color }}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(doc.createdAt)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
