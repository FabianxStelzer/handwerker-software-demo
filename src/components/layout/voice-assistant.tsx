"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Check,
  Loader2,
  Bot,
  User,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  action?: {
    endpoint: string;
    method: string;
    body: Record<string, unknown> | null;
  } | null;
  type?: "message" | "confirm" | "action";
  data?: unknown;
  pending?: boolean;
}

const LANG_MAP: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
  tr: "tr-TR",
  pl: "pl-PL",
  ru: "ru-RU",
  cs: "cs-CZ",
  uk: "uk-UA",
  ro: "ro-RO",
  hr: "hr-HR",
  ar: "ar-SA",
};

function getSpeechLang(lang: string): string {
  return LANG_MAP[lang] || "de-DE";
}

export function VoiceAssistant() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<VoiceMessage | null>(null);

  const recognitionRef = useRef<ReturnType<typeof Object> | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef("");

  const userLang = ((session?.user as Record<string, unknown>)?.language as string) || "de";
  const userName = session?.user?.name || "Benutzer";
  const userRole = ((session?.user as Record<string, unknown>)?.role as string) || "MITARBEITER";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.getVoices();
    const handleVoices = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", handleVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handleVoices);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!speakEnabled || typeof window === "undefined" || !text) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getSpeechLang(userLang);
      utterance.rate = 0.95;
      utterance.pitch = 1.15;
      utterance.volume = 1.0;

      const langTag = getSpeechLang(userLang);
      const langPrefix = langTag.split("-")[0];
      const voices = window.speechSynthesis.getVoices();

      const langVoices = voices.filter(
        (v) => v.lang.startsWith(langPrefix) || v.lang.startsWith(langTag)
      );

      const femaleKeywords = ["female", "frau", "woman", "anna", "helena", "petra", "marlene", "vicki", "karin", "sara", "ewa", "zuzana", "milena", "alva", "fiona", "samantha", "karen", "moira", "tessa", "amelie"];
      const findFemale = (list: SpeechSynthesisVoice[]) =>
        list.find((v) => femaleKeywords.some((k) => v.name.toLowerCase().includes(k)));

      const remoteVoices = langVoices.filter((v) => !v.localService);
      const localVoices = langVoices.filter((v) => v.localService);

      const selected =
        findFemale(remoteVoices) ||
        findFemale(localVoices) ||
        findFemale(voices.filter((v) => v.lang.startsWith(langPrefix))) ||
        remoteVoices[0] ||
        localVoices[0] ||
        null;

      if (selected) utterance.voice = selected;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [speakEnabled, userLang]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const sendToAi = useCallback(
    async (userText: string, conversationMessages: VoiceMessage[]) => {
      setProcessing(true);

      const apiMessages = conversationMessages
        .filter((m) => !m.pending)
        .map((m) => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: "user", content: userText });

      try {
        const res = await fetch("/api/ki/voice-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            userInfo: {
              name: userName,
              role: userRole,
              language: userLang,
              currentPath: pathname,
            },
          }),
        });

        const data = await res.json();

        const displayText = data.text || data.content || "Ich konnte das nicht verarbeiten.";
        const spokenText = data.spoken || displayText;

        const assistantMsg: VoiceMessage = {
          role: "assistant",
          content: displayText,
          type: data.type || "message",
          action: data.action || null,
          data: data.data || null,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        speak(spokenText);

        if (data.type === "confirm" && data.action) {
          setPendingConfirm(assistantMsg);
        }

        if (data.type === "action" && data.action) {
          await executeAction(data.action);
        }
      } catch {
        const errMsg: VoiceMessage = {
          role: "assistant",
          content: "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.",
          type: "message",
        };
        setMessages((prev) => [...prev, errMsg]);
        speak(errMsg.content);
      }

      setProcessing(false);
    },
    [userName, userRole, userLang, pathname, speak]
  );

  const executeAction = useCallback(
    async (action: { endpoint: string; method: string; body: Record<string, unknown> | null }) => {
      if (action.endpoint === "NAVIGATE") {
        const path = (action.body as Record<string, string>)?.path;
        if (path) {
          router.push(path);
          const navMsg: VoiceMessage = {
            role: "assistant",
            content: `Navigiere zu ${path}...`,
            type: "message",
          };
          setMessages((prev) => [...prev, navMsg]);
        }
        return;
      }

      try {
        const res = await fetch("/api/ki/voice-action", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        const result = await res.json();

        if (result.navigate) {
          router.push(result.navigate);
          return;
        }

        if (result.success && result.data) {
          const dataStr = JSON.stringify(result.data).slice(0, 2000);
          setMessages((prev) => [
            ...prev,
            { role: "user", content: `[Ergebnis der Abfrage: ${dataStr}]` },
          ]);

          await sendToAi(`Die API hat folgendes zurückgegeben: ${dataStr}. Bitte fasse das für mich zusammen.`, [
            ...messages,
          ]);
        }
      } catch {
        speak("Die Aktion konnte nicht ausgeführt werden.");
      }
    },
    [router, speak, messages, sendToAi]
  );

  const confirmAction = useCallback(async () => {
    if (!pendingConfirm?.action) return;
    setPendingConfirm(null);

    const confirmMsg: VoiceMessage = {
      role: "user",
      content: "Ja, bitte ausführen.",
    };
    setMessages((prev) => [...prev, confirmMsg]);
    setProcessing(true);

    await executeAction(pendingConfirm.action);

    const doneMsg: VoiceMessage = {
      role: "assistant",
      content: "Erledigt!",
      type: "message",
    };
    setMessages((prev) => [...prev, doneMsg]);
    speak("Erledigt!");
    setProcessing(false);
  }, [pendingConfirm, executeAction, speak]);

  const cancelAction = useCallback(() => {
    setPendingConfirm(null);
    const cancelMsg: VoiceMessage = {
      role: "assistant",
      content: "Okay, abgebrochen.",
      type: "message",
    };
    setMessages((prev) => [...prev, cancelMsg]);
    speak("Okay, abgebrochen.");
  }, [speak]);

  const finishRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const finalText = accumulatedTextRef.current.trim();
    accumulatedTextRef.current = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (recognitionRef.current as any)?.stop();
    setIsListening(false);
    setTranscript("");

    if (finalText) {
      const userMsg: VoiceMessage = { role: "user", content: finalText };
      setMessages((prev) => {
        const updated = [...prev, userMsg];
        sendToAi(finalText, updated);
        return updated;
      });
    }
  }, [sendToAi]);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      const errMsg: VoiceMessage = {
        role: "assistant",
        content: "Spracherkennung wird von diesem Browser nicht unterstützt. Bitte verwende Chrome.",
        type: "message",
      };
      setMessages((prev) => [...prev, errMsg]);
      return;
    }

    stopSpeaking();
    accumulatedTextRef.current = "";

    const recognition = new SR();
    recognition.lang = getSpeechLang(userLang);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalParts = "";
      let interimParts = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalParts += r[0].transcript;
        } else {
          interimParts += r[0].transcript;
        }
      }

      accumulatedTextRef.current = finalParts;
      setTranscript((finalParts + interimParts).trim());

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (accumulatedTextRef.current.trim()) {
          finishRecording();
        }
      }, 2500);
    };

    recognition.onend = () => {
      if (accumulatedTextRef.current.trim()) {
        finishRecording();
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (e: { error?: string }) => {
      if (e.error === "no-speech") return;
      if (accumulatedTextRef.current.trim()) {
        finishRecording();
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
  }, [userLang, stopSpeaking, finishRecording]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (accumulatedTextRef.current.trim()) {
      finishRecording();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any)?.stop();
      setIsListening(false);
    }
  }, [finishRecording]);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setPendingConfirm(null);
    setTranscript("");
    stopSpeaking();
  }, [stopSpeaking]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, #212f46 0%, #354360 100%)" }}
        title="Sprachassistent"
      >
        <Mic className="h-6 w-6 text-white" />
      </button>
    );
  }

  return (
    <div className={cn("fixed bottom-6 right-6 z-50 transition-all", isExpanded ? "w-96" : "w-80")}>
      <Card className="shadow-2xl border-0 overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: "linear-gradient(135deg, #212f46 0%, #354360 100%)" }}
        >
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-white" />
            <h4 className="font-semibold text-white text-sm">Sprachassistent</h4>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSpeakEnabled(!speakEnabled)}
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
              title={speakEnabled ? "Sprachausgabe aus" : "Sprachausgabe an"}
            >
              {speakEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetConversation}
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
              title="Neues Gespräch"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false);
                stopListening();
                stopSpeaking();
              }}
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          <div
            ref={scrollContainerRef}
            className={cn("overflow-y-auto px-4 py-3 space-y-3", isExpanded ? "max-h-[60vh]" : "max-h-[50vh]", "min-h-[160px]")}
          >
            {messages.length === 0 && !isListening && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full mb-3"
                  style={{ backgroundColor: "#9eb55220" }}
                >
                  <Mic className="h-6 w-6" style={{ color: "#9eb552" }} />
                </div>
                <p className="text-sm font-medium text-gray-700">Hallo{userName ? `, ${userName.split(" ")[0]}` : ""}!</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
                  Drücke den Mikrofon-Button und sprich mit mir. Ich kann Kunden anlegen, Projekte verwalten, Daten abrufen und vieles mehr.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                    msg.role === "user"
                      ? "text-white rounded-br-md"
                      : "bg-gray-100 text-gray-900 rounded-bl-md"
                  )}
                  style={msg.role === "user" ? { backgroundColor: "#354360" } : undefined}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {msg.role === "assistant" ? (
                      <Bot className="h-3 w-3 shrink-0" style={{ color: "#9eb552" }} />
                    ) : (
                      <User className="h-3 w-3 shrink-0 opacity-70" />
                    )}
                    <span className="text-[10px] font-medium opacity-60">
                      {msg.role === "assistant" ? "Assistent" : "Du"}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {isListening && (
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-br-md px-3.5 py-2.5 text-white" style={{ backgroundColor: "#354360" }}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 bg-red-400 rounded-full animate-pulse" />
                      <div className="h-1.5 w-1.5 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                      <div className="h-1.5 w-1.5 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                    </div>
                    <span className="text-xs opacity-80">{transcript || "Ich höre zu..."}</span>
                  </div>
                </div>
              </div>
            )}

            {processing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#9eb552" }} />
                    <span className="text-xs text-gray-500">Denke nach...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {pendingConfirm && (
            <div className="px-4 py-3 border-t bg-amber-50/80">
              <p className="text-xs font-medium text-amber-800 mb-2">Aktion bestätigen?</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={confirmAction}
                  disabled={processing}
                  className="flex-1 text-white text-xs h-8"
                  style={{ backgroundColor: "#9eb552" }}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Ja, ausführen
                </Button>
                <Button size="sm" variant="outline" onClick={cancelAction} className="flex-1 text-xs h-8">
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-t bg-white">
            <div className="flex items-center justify-center gap-3">
              {isSpeaking && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={stopSpeaking}
                  className="h-10 w-10 rounded-full border-red-200 text-red-500 hover:bg-red-50"
                  title="Vorlesen stoppen"
                >
                  <VolumeX className="h-4 w-4" />
                </Button>
              )}

              <button
                onClick={isListening ? stopListening : startListening}
                disabled={processing}
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-full transition-all",
                  isListening
                    ? "bg-red-500 hover:bg-red-600 scale-110"
                    : "hover:scale-105"
                )}
                style={!isListening ? { backgroundColor: "#9eb552" } : undefined}
              >
                {isListening && (
                  <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
                )}
                {isListening ? (
                  <MicOff className="h-6 w-6 text-white relative z-10" />
                ) : (
                  <Mic className="h-6 w-6 text-white relative z-10" />
                )}
              </button>

              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={resetConversation}
                  className="h-10 w-10 rounded-full"
                  title="Neues Gespräch"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>

            <p className="text-[10px] text-center text-gray-400 mt-2">
              {isListening
                ? "Sprich jetzt..."
                : processing
                  ? "Verarbeite..."
                  : "Tippe auf das Mikrofon zum Sprechen"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
