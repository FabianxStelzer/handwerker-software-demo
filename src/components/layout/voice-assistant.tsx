"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VoiceAction {
  intent: string;
  description: string;
  params: Record<string, string>;
  confirmed: boolean;
}

const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: string; extract: (m: RegExpMatchArray) => Record<string, string> }> = [
  {
    pattern: /kunde.*anlegen.*(?:name|namens?)?\s+(.+)/i,
    intent: "KUNDE_ANLEGEN",
    extract: (m) => ({ name: m[1].trim() }),
  },
  {
    pattern: /status.*(?:von|für)?\s+(.+?)\s+(?:auf|zu|ändern)\s+(.+)/i,
    intent: "STATUS_AENDERN",
    extract: (m) => ({ target: m[1].trim(), status: m[2].trim() }),
  },
  {
    pattern: /notiz.*(?:für|zu|bei)?\s+(.+?)(?:\s*[:]\s*|\s+)(.+)/i,
    intent: "NOTIZ_HINZUFUEGEN",
    extract: (m) => ({ target: m[1].trim(), content: m[2].trim() }),
  },
  {
    pattern: /(?:bautagebuch|tagesbericht).*(?:eintrag|eintragen)?\s*(?:für)?\s*(.+?)(?:\s*[:]\s*|\s+)(.+)/i,
    intent: "BAUTAGEBUCH_EINTRAG",
    extract: (m) => ({ project: m[1].trim(), content: m[2].trim() }),
  },
];

export function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [action, setAction] = useState<VoiceAction | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setResult("Spracherkennung wird von diesem Browser nicht unterstützt.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);

      if (event.results[0].isFinal) {
        parseIntent(text);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
    setAction(null);
    setResult(null);
  }, []);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  function parseIntent(text: string) {
    for (const { pattern, intent, extract } of INTENT_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const params = extract(match);
        const descriptions: Record<string, string> = {
          KUNDE_ANLEGEN: `Neuen Kunden anlegen: "${params.name}"`,
          STATUS_AENDERN: `Status von "${params.target}" auf "${params.status}" ändern`,
          NOTIZ_HINZUFUEGEN: `Notiz zu "${params.target}" hinzufügen`,
          BAUTAGEBUCH_EINTRAG: `Bautagebuch-Eintrag für "${params.project}"`,
        };
        setAction({
          intent,
          description: descriptions[intent] || intent,
          params,
          confirmed: false,
        });
        return;
      }
    }
    setResult(`Befehl nicht erkannt: "${text}". Versuchen Sie z.B. "Kunde anlegen Name" oder "Bautagebuch Eintrag für Projekt: Beschreibung".`);
  }

  async function confirmAction() {
    if (!action) return;
    setProcessing(true);

    try {
      switch (action.intent) {
        case "KUNDE_ANLEGEN": {
          const parts = action.params.name.split(" ");
          const firstName = parts[0] || "";
          const lastName = parts.slice(1).join(" ") || firstName;
          await fetch("/api/kunden", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firstName, lastName }),
          });
          setResult(`Kunde "${action.params.name}" wurde angelegt.`);
          break;
        }
        default:
          setResult(`Aktion "${action.intent}" wird ausgeführt...`);
      }
    } catch {
      setResult("Fehler bei der Ausführung.");
    }

    setProcessing(false);
    setAction(null);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-105"
        title="Sprachassistent"
      >
        <Mic className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80">
      <Card className="shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Sprachassistent</h4>
            <Button variant="ghost" size="icon" onClick={() => { setIsOpen(false); stopListening(); }} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-[100px] flex flex-col items-center justify-center gap-3">
            {isListening && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-500">
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">Ich höre zu...</p>
                {transcript && <p className="text-sm text-gray-700 italic text-center">&quot;{transcript}&quot;</p>}
              </>
            )}

            {!isListening && !action && !result && (
              <p className="text-sm text-gray-500 text-center">
                Drücken Sie den Knopf und sprechen Sie einen Befehl, z.B. &quot;Kunde anlegen Max Müller&quot;
              </p>
            )}

            {action && !action.confirmed && (
              <div className="w-full space-y-3">
                <p className="text-sm font-medium text-gray-900">{action.description}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={confirmAction} disabled={processing} className="flex-1">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Bestätigen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAction(null)} className="flex-1">
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {result && (
              <div className="w-full">
                <p className="text-sm text-gray-700">{result}</p>
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setResult(null)}>
                  OK
                </Button>
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-center">
            <Button
              onClick={isListening ? stopListening : startListening}
              className={cn(
                "rounded-full h-12 w-12",
                isListening ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
              )}
              size="icon"
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
