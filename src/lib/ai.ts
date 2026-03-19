import { prisma } from "@/lib/prisma";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiResponse {
  content: string;
  model: string;
  provider: string;
}

export type AiFunction = "chat" | "aufmass";

export async function getProviderForFunction(fn: AiFunction) {
  const settings = await prisma.companySettings.findFirst();
  const assignedId = fn === "chat" ? settings?.aiChatProviderId : settings?.aiAufmassProviderId;

  if (assignedId) {
    const assigned = await prisma.aiProvider.findFirst({ where: { id: assignedId, isActive: true } });
    if (assigned) return assigned;
  }

  let provider = await prisma.aiProvider.findFirst({
    where: { isDefault: true, isActive: true },
  });
  if (!provider) {
    provider = await prisma.aiProvider.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }
  return provider;
}

export async function chatWithAi(
  messages: AiMessage[],
  providerId?: string,
  fn?: AiFunction
): Promise<AiResponse> {
  let provider;
  if (providerId) {
    provider = await prisma.aiProvider.findUnique({ where: { id: providerId } });
  } else {
    provider = await getProviderForFunction(fn || "chat");
  }

  if (!provider) throw new Error("Kein KI-Modell konfiguriert. Bitte unter Einstellungen → KI-Modelle einrichten.");

  switch (provider.provider) {
    case "anthropic":
      return callAnthropic(provider, messages);
    case "openai":
      return callOpenAI(provider, messages);
    case "google":
      return callGoogle(provider, messages);
    case "ollama":
      return callOllama(provider, messages);
    default:
      throw new Error(`Unbekannter Provider: ${provider.provider}`);
  }
}

async function callAnthropic(
  provider: { apiKey: string | null; model: string | null; provider: string },
  messages: AiMessage[]
): Promise<AiResponse> {
  if (!provider.apiKey) throw new Error("Anthropic API-Key fehlt");

  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs = messages.filter((m) => m.role !== "system");

  const body: any = {
    model: provider.model || "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
  };
  if (systemMsg) body.system = systemMsg.content;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic Fehler (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    content: data.content?.[0]?.text || "",
    model: data.model || provider.model || "claude",
    provider: "anthropic",
  };
}

async function callOpenAI(
  provider: { apiKey: string | null; model: string | null; provider: string },
  messages: AiMessage[]
): Promise<AiResponse> {
  if (!provider.apiKey) throw new Error("OpenAI API-Key fehlt");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model || "gpt-4o-mini",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI Fehler (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    model: data.model || provider.model || "gpt",
    provider: "openai",
  };
}

async function callGoogle(
  provider: { apiKey: string | null; model: string | null; provider: string },
  messages: AiMessage[]
): Promise<AiResponse> {
  if (!provider.apiKey) throw new Error("Google API-Key fehlt");

  const model = provider.model || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${provider.apiKey}`;

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: any = { contents };

  const systemMsg = messages.find((m) => m.role === "system");
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Fehler (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    model,
    provider: "google",
  };
}

async function callOllama(
  provider: { apiUrl: string | null; model: string | null; provider: string },
  messages: AiMessage[]
): Promise<AiResponse> {
  const base = provider.apiUrl || "http://localhost:11434";
  const model = provider.model || "llama3.1";

  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama Fehler (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    content: data.message?.content || "",
    model: data.model || model,
    provider: "ollama",
  };
}
