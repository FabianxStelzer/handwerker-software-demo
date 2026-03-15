"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

interface Props {
  project: any;
  onUpdate: () => void;
}

export function ChatTab({ project, onUpdate }: Props) {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !session?.user?.id) return;
    setSending(true);
    await fetch(`/api/projekte/${project.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.user.id, content: message }),
    });
    setMessage("");
    setSending(false);
    onUpdate();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Projekt-Chat</h3>

      <Card>
        <CardContent className="p-4">
          <div className="h-[400px] overflow-y-auto space-y-3 mb-4">
            {project.chatMessages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Noch keine Nachrichten</p>
            ) : (
              project.chatMessages.map((msg: any) => {
                const isMe = msg.userId === session?.user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2 ${isMe ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                      {!isMe && (
                        <p className="text-xs font-medium mb-0.5 opacity-70">
                          {msg.user.firstName} {msg.user.lastName}
                        </p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                        {formatDateTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nachricht schreiben..."
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={sending || !message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
