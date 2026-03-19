"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Plus, Send, Trash2, MessageSquare, FolderOpen, Bot, User, Settings, Shield, Paperclip, FileText, X as XIcon, FileSpreadsheet, File as FileIcon, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AiProviderOption {
  id: string;
  name: string;
  provider: string;
  model: string | null;
  isDefault: boolean;
  isLocal: boolean;
  isActive: boolean;
}

export default function KIAssistentPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [providers, setProviders] = useState<AiProviderOption[]>([]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = session?.user?.id;

  useEffect(() => {
    fetch("/api/ai-providers")
      .then((r) => r.json())
      .then((data: AiProviderOption[]) => setProviders(data.filter((p) => p.isActive)));
  }, []);

  const activeProvider = providers.find((p) => p.isDefault) || providers[0];

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/ki/conversations?userId=${userId}`)
      .then((r) => r.json())
      .then(setConversations);
  }, [userId]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    fetch(`/api/ki/chat?conversationId=${activeId}`)
      .then((r) => r.json())
      .then(setMessages);
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function createConversation() {
    if (!userId) return;
    const res = await fetch("/api/ki/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, model: activeProvider?.model || "standard" }),
    });
    const conv = await res.json();
    setConversations([conv, ...conversations]);
    setActiveId(conv.id);
  }

  async function deleteConversation(id: string) {
    await fetch("/api/ki/conversations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConversations(conversations.filter((c) => c.id !== id));
    if (activeId === id) { setActiveId(null); setMessages([]); }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || !activeId) return;

    const userMsg: any = {
      id: "temp",
      role: "user",
      content: input,
      fileName: attachedFile?.name || null,
      fileType: attachedFile ? attachedFile.name.split(".").pop() : null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    const currentFile = attachedFile;
    setInput("");
    setAttachedFile(null);
    setSending(true);

    let res: Response;
    if (currentFile) {
      const formData = new FormData();
      formData.append("conversationId", activeId);
      formData.append("content", currentInput);
      formData.append("file", currentFile);
      res = await fetch("/api/ki/chat", { method: "POST", body: formData });
    } else {
      res = await fetch("/api/ki/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, content: currentInput }),
      });
    }
    const aiMsg = await res.json();
    setMessages((prev) => [...prev.filter((m) => m.id !== "temp"), { ...userMsg, id: "user-" + Date.now() }, aiMsg]);
    setSending(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setAttachedFile(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function getFileIcon(type: string | null) {
    if (!type) return <FileIcon className="h-3.5 w-3.5" />;
    if (["pdf"].includes(type)) return <FileText className="h-3.5 w-3.5 text-red-500" />;
    if (["xlsx", "xls", "csv"].includes(type)) return <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />;
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(type)) return <ImageIcon className="h-3.5 w-3.5 text-blue-500" />;
    return <FileIcon className="h-3.5 w-3.5 text-gray-500" />;
  }

  const activeConv = conversations.find((c) => c.id === activeId);
  const folders = [...new Set(conversations.map((c) => c.folder).filter(Boolean))];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-72 shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Gespräche</h2>
          <Button size="sm" onClick={createConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-3">
          {providers.length > 0 ? (
            <div className="p-2 bg-gray-50 rounded-lg border">
              <p className="text-[10px] uppercase font-medium text-gray-400 mb-1">Aktives KI-Modell</p>
              <div className="flex items-center gap-1.5">
                {activeProvider?.isLocal && <Shield className="h-3 w-3 text-green-600" />}
                <p className="text-xs font-medium text-gray-800">{activeProvider?.name}</p>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">{activeProvider?.model || "Standard"}</p>
            </div>
          ) : (
            <Link href="/einstellungen" className="block p-2 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-xs text-amber-700 font-medium">KI-Modell einrichten</p>
              </div>
              <p className="text-[10px] text-amber-600 mt-0.5">Unter Einstellungen → KI-Modelle</p>
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {folders.length > 0 && folders.map((folder) => (
            <div key={folder} className="mb-3">
              <div className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase mb-1 px-2">
                <FolderOpen className="h-3 w-3" /> {folder}
              </div>
              {conversations.filter((c) => c.folder === folder).map((conv) => (
                <ConvItem key={conv.id} conv={conv} active={activeId === conv.id} onClick={() => setActiveId(conv.id)} onDelete={() => deleteConversation(conv.id)} />
              ))}
            </div>
          ))}
          {conversations.filter((c) => !c.folder).map((conv) => (
            <ConvItem key={conv.id} conv={conv} active={activeId === conv.id} onClick={() => setActiveId(conv.id)} onDelete={() => deleteConversation(conv.id)} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Bot className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">KI-Assistent</p>
              <p className="text-sm mt-1">Wählen Sie ein Gespräch oder starten Sie ein neues</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <div>
                <h3 className="font-semibold">{activeConv?.title || "Gespräch"}</h3>
                <Badge variant="secondary" className="text-xs mt-1">
                  {activeProvider?.name || "Kein KI-Modell"}
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={cn("max-w-[80%] rounded-xl px-4 py-3", msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900")}>
                    <div className="flex items-center gap-2 mb-1">
                      {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      <span className="text-xs font-medium opacity-70">{msg.role === "assistant" ? "KI" : "Du"}</span>
                    </div>
                    {msg.fileName && (
                      <div className={cn("flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg text-xs", msg.role === "user" ? "bg-blue-500/30" : "bg-gray-200")}>
                        {getFileIcon(msg.fileType)}
                        <span className="truncate font-medium">{msg.fileName}</span>
                        {msg.fileUrl && (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                            className={cn("ml-auto shrink-0 underline text-[10px]", msg.role === "user" ? "text-blue-100" : "text-blue-600")}>
                            Öffnen
                          </a>
                        )}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="pt-3 border-t">
              {attachedFile && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  {getFileIcon(attachedFile.name.split(".").pop() || null)}
                  <span className="text-xs font-medium text-blue-800 truncate">{attachedFile.name}</span>
                  <span className="text-[10px] text-blue-500">({(attachedFile.size / 1024).toFixed(0)} KB)</span>
                  <button onClick={() => setAttachedFile(null)} className="ml-auto text-blue-400 hover:text-blue-600">
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.txt,.csv,.xlsx,.xls,.x31,.d11,.xml,.json,.md,.html,.css,.js,.ts,.log,.png,.jpg,.jpeg,.gif,.webp"
                />
                <Button type="button" variant="outline" size="icon" className="shrink-0"
                  onClick={() => fileInputRef.current?.click()} disabled={sending}
                  title="Datei anhängen">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={attachedFile ? "Frage zur Datei stellen oder Nachricht eingeben..." : "Nachricht eingeben... z.B. 'Berechne die benötigte Dämmstoffmenge für 120m² Dachfläche'"}
                  disabled={sending}
                />
                <Button type="submit" size="icon" disabled={sending || (!input.trim() && !attachedFile)}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConvItem({ conv, active, onClick, onDelete }: { conv: any; active: boolean; onClick: () => void; onDelete: () => void }) {
  return (
    <div
      className={cn("flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer group", active ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700")}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-w-0">
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span className="text-sm truncate">{conv.title}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-600" />
      </button>
    </div>
  );
}
