"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/projekte/overview-tab";
import { DiaryTab } from "@/components/projekte/diary-tab";
import { DocumentsTab } from "@/components/projekte/documents-tab";
import { TasksTab } from "@/components/projekte/tasks-tab";
import { ChatTab } from "@/components/projekte/chat-tab";
import { MaterialTab } from "@/components/projekte/material-tab";
import { BlueprintsTab } from "@/components/projekte/blueprints-tab";
import { RegieberichtTab } from "@/components/projekte/regiebericht-tab";
import { EinbauTab } from "@/components/projekte/einbau-tab";
import { AufmassTab } from "@/components/projekte/aufmass-tab";
import { AuftraegeTab } from "@/components/projekte/auftraege-tab";

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "secondary" | "destructive" }> = {
  PLANUNG: { label: "Planung", variant: "secondary" },
  AKTIV: { label: "Aktiv", variant: "default" },
  PAUSIERT: { label: "Pausiert", variant: "warning" },
  ABGESCHLOSSEN: { label: "Abgeschlossen", variant: "success" },
  STORNIERT: { label: "Storniert", variant: "destructive" },
};

export default function ProjektDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<any>(null);

  const load = () => {
    fetch(`/api/projekte/${id}`)
      .then((r) => r.json())
      .then(setProject);
  };

  useEffect(() => { load(); }, [id]);

  if (!project) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const sc = statusConfig[project.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/projekte")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <Badge variant={sc?.variant || "secondary"}>{sc?.label || project.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {project.projectNumber} · {project.customer.type === "GESCHAEFT" && project.customer.company ? project.customer.company : `${project.customer.firstName} ${project.customer.lastName}`}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="uebersicht">
        <TabsList className="flex-wrap">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="bautagebuch">Bautagebuch</TabsTrigger>
          <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="aufgaben">Aufgaben</TabsTrigger>
          <TabsTrigger value="bauplaene">Baupläne</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="einbau">Einbau</TabsTrigger>
          <TabsTrigger value="aufmass">Aufmaß</TabsTrigger>
          <TabsTrigger value="auftraege">Aufträge</TabsTrigger>
          <TabsTrigger value="regieberichte">Regieberichte</TabsTrigger>
        </TabsList>

        <TabsContent value="uebersicht">
          <OverviewTab project={project} onUpdate={load} />
        </TabsContent>
        <TabsContent value="bautagebuch">
          <DiaryTab project={project} onUpdate={load} />
        </TabsContent>
        <TabsContent value="dokumente">
          <DocumentsTab project={project} onUpdate={load} />
        </TabsContent>
        <TabsContent value="chat">
          <ChatTab project={project} onUpdate={load} />
        </TabsContent>
        <TabsContent value="aufgaben">
          <TasksTab project={project} onUpdate={load} />
        </TabsContent>
        <TabsContent value="bauplaene">
          <BlueprintsTab project={project} onUpdate={load} />
        </TabsContent>
        <TabsContent value="material">
          <MaterialTab project={project} onUpdate={load} />
        </TabsContent>
        <TabsContent value="einbau">
          <EinbauTab project={project} />
        </TabsContent>
        <TabsContent value="aufmass">
          <AufmassTab project={project} />
        </TabsContent>
        <TabsContent value="auftraege">
          <AuftraegeTab project={project} />
        </TabsContent>
        <TabsContent value="regieberichte">
          <RegieberichtTab project={project} onUpdate={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
