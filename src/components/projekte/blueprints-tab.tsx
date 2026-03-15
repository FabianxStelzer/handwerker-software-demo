"use client";

import { FileImage, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Props {
  project: any;
  onUpdate: () => void;
}

export function BlueprintsTab({ project, onUpdate }: Props) {
  const blueprints = project.blueprints || [];
  const folders = [...new Set(blueprints.map((b: any) => b.folder))] as string[];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Baupläne</h3>
      </div>

      {blueprints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Noch keine Baupläne hochgeladen
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {folders.map((folder) => (
            <div key={folder}>
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-4 w-4 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-700">{folder}</h4>
                <Badge variant="secondary" className="text-xs">
                  {blueprints.filter((b: any) => b.folder === folder).length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {blueprints.filter((b: any) => b.folder === folder).map((bp: any) => (
                  <a key={bp.id} href={bp.fileUrl} target="_blank" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <FileImage className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{bp.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(bp.createdAt)}</p>
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
