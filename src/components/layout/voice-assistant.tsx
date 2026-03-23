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

interface ActionPayload {
  endpoint: string;
  method: string;
  body: Record<string, unknown> | null;
}

interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  action?: ActionPayload | null;
  type?: "message" | "confirm" | "action";
  data?: unknown;
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

const YES_PATTERNS = /^(ja|yes|ok|okay|mach|klar|sicher|genau|bitte|do it|sure|tak|да|ano|evet|bestätig|ausführ|mach das|jawohl|go ahead|let's go)/i;

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
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);

  const recognitionRef = useRef<ReturnType<typeof Object> | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef("");
  const messagesRef = useRef<VoiceMessage[]>([]);

  messagesRef.current = messages;

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

  const addMessage = useCallback((msg: VoiceMessage) => {
    setMessages((prev) => [...prev, msg]);
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

  const callApi = useCallback(
    async (action: ActionPayload): Promise<{ success: boolean; data?: unknown; error?: string }> => {
      if (action.endpoint === "NAVIGATE") {
        const path = (action.body as Record<string, string>)?.path;
        if (path) router.push(path);
        return { success: true };
      }

      try {
        const res = await fetch("/api/ki/voice-action", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        return await res.json();
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
      }
    },
    [router]
  );

  const sendToAi = useCallback(
    async (userText: string) => {
      setProcessing(true);

      const current = messagesRef.current;
      const apiMessages = current.map((m) => ({ role: m.role, content: m.content }));
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

        addMessage(assistantMsg);
        speak(spokenText);

        if (data.type === "confirm" && data.action) {
          setPendingAction(data.action);
        } else if (data.type === "action" && data.action) {
          const result = await callApi(data.action);

          if (data.action.endpoint === "NAVIGATE") {
            addMessage({ role: "assistant", content: `Navigiere...`, type: "message" });
          } else if (result.success) {
            if (result.data && data.action.method === "GET") {
              const dataStr = JSON.stringify(result.data).slice(0, 2000);
              addMessage({ role: "user", content: `[Ergebnis: ${dataStr}]` });

              setProcessing(true);
              const summaryMessages = [
                ...messagesRef.current.map((m) => ({ role: m.role, content: m.content })),
                { role: "user" as const, content: `Die API hat folgendes zurückgegeben: ${dataStr}. Fasse das kurz zusammen.` },
              ];
              const summaryRes = await fetch("/api/ki/voice-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: summaryMessages, userInfo: { name: userName, role: userRole, language: userLang, currentPath: pathname } }),
              });
              const summaryData = await summaryRes.json();
              const summaryText = summaryData.text || summaryData.content || "Daten abgerufen.";
              addMessage({ role: "assistant", content: summaryText, type: "message" });
              speak(summaryData.spoken || summaryText);
            } else {
              addMessage({ role: "assistant", content: "Erledigt!", type: "message" });
              speak("Erledigt!");
            }
          } else {
            const errText = `Das hat leider nicht geklappt: ${result.error || "Unbekannter Fehler"}`;
            addMessage({ role: "assistant", content: errText, type: "message" });
            speak("Das hat leider nicht geklappt.");
          }
        }
      } catch {
        addMessage({ role: "assistant", content: "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.", type: "message" });
        speak("Es ist ein Fehler aufgetreten.");
      }

      setProcessing(false);
    },
    [userName, userRole, userLang, pathname, speak, addMessage, callApi]
  );

  const executeConfirmedAction = useCallback(
    async (action: ActionPayload) => {
      setPendingAction(null);
      addMessage({ role: "user", content: "Ja, bitte ausführen." });
      setProcessing(true);

      const result = await callApi(action);

      if (action.endpoint === "NAVIGATE") {
        addMessage({ role: "assistant", content: "Navigiere...", type: "message" });
        speak("Navigiere...");
      } else if (result.success) {
        addMessage({ role: "assistant", content: "Erledigt!", type: "message" });
        speak("Erledigt!");
      } else {
        const errText = `Das hat leider nicht geklappt: ${result.error || "Unbekannter Fehler"}`;
        addMessage({ role: "assistant", content: errText, type: "message" });
        speak("Das hat leider nicht geklappt.");
      }

      setProcessing(false);
    },
    [callApi, addMessage, speak]
  );

  const cancelPendingAction = useCallback(() => {
    setPendingAction(null);
    addMessage({ role: "assistant", content: "Okay, abgebrochen.", type: "message" });
    speak("Okay, abgebrochen.");
  }, [addMessage, speak]);

  const handleUserInput = useCallback(
    (text: string) => {
      const userMsg: VoiceMessage = { role: "user", content: text };
      addMessage(userMsg);

      if (pendingAction && YES_PATTERNS.test(text.trim())) {
        executeConfirmedAction(pendingAction);
      } else if (pendingAction && /^(nein|no|abbrech|cancel|stopp|nie|stop|hayır|нет|ne)/i.test(text.trim())) {
        cancelPendingAction();
      } else {
        if (pendingAction) setPendingAction(null);
        sendToAi(text);
      }
    },
    [pendingAction, addMessage, executeConfirmedAction, cancelPendingAction, sendToAi]
  );

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
      handleUserInput(finalText);
    }
  }, [handleUserInput]);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      addMessage({
        role: "assistant",
        content: "Spracherkennung wird von diesem Browser nicht unterstützt. Bitte verwende Chrome.",
        type: "message",
      });
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
  }, [userLang, stopSpeaking, finishRecording, addMessage]);

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
    setPendingAction(null);
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
                      {msg.role === "assistant" ? "Assistentin" : "Du"}
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

          {pendingAction && (
            <div className="px-4 py-3 border-t bg-amber-50/80">
              <p className="text-xs font-medium text-amber-800 mb-2">Aktion bestätigen?</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => executeConfirmedAction(pendingAction)}
                  disabled={processing}
                  className="flex-1 text-white text-xs h-8"
                  style={{ backgroundColor: "#9eb552" }}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Ja, ausführen
                </Button>
                <Button size="sm" variant="outline" onClick={cancelPendingAction} className="flex-1 text-xs h-8">
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
                  : pendingAction
                    ? 'Sage "Ja" oder klicke auf den Button'
                    : "Tippe auf das Mikrofon zum Sprechen"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
