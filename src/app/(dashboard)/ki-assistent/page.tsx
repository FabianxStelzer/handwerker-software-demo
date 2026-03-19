"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Plus, Send, Trash2, MessageSquare, FolderOpen, Bot, User, Settings, Shield } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!input.trim() || !activeId) return;

    const userMsg = { id: "temp", role: "user", content: input, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    const res = await fetch("/api/ki/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeId, content: input }),
    });
    const aiMsg = await res.json();
    setMessages((prev) => [...prev.filter((m) => m.id !== "temp"), { ...userMsg, id: "user-" + Date.now() }, aiMsg]);
    setSending(false);
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

            <form onSubmit={sendMessage} className="flex gap-2 pt-3 border-t">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nachricht eingeben... z.B. 'Berechne die benötigte Dämmstoffmenge für 120m² Dachfläche'"
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
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
