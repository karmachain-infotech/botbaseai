import type { AIProviderInterface, AIChatParams } from "./types";

interface GroqChunk {
  choices?: {
    delta?: { content?: string };
    finish_reason?: string | null;
  }[];
}

export class GroqProvider implements AIProviderInterface {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1/chat/completions";

  constructor() {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY environment variable is not set");
    this.apiKey = key;
  }

  async generateStream(
    _params: AIChatParams,
    onChunk?: (text: string) => void,
  ): Promise<string> {
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

    const messages: { role: string; content: string }[] = [];
    if (_params.systemInstruction) {
      messages.push({ role: "system", content: _params.systemInstruction });
    }
    for (const m of _params.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Groq API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Groq response body is not readable");

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const chunk = JSON.parse(payload) as GroqChunk;
            const text = chunk.choices?.[0]?.delta?.content || "";
            if (text) {
              fullContent += text;
              onChunk?.(text);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!fullContent) {
      fullContent = "Sorry, I couldn't generate a response.";
      onChunk?.(fullContent);
    }

    return fullContent;
  }
}
