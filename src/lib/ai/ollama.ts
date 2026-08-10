import type { AIProviderInterface, AIChatParams } from "./types";

interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

export class OllamaProvider implements AIProviderInterface {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  }

  async generateStream(
    params: AIChatParams,
    onChunk?: (text: string) => void,
  ): Promise<string> {
    const model = params.model || process.env.OLLAMA_MODEL || "llama3";

    const messages: OllamaChatMessage[] = [];
    if (params.systemInstruction) {
      messages.push({ role: "system", content: params.systemInstruction });
    }
    for (const m of params.messages) {
      messages.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      });
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        keep_alive: "5m",
        options: { num_predict: 512, temperature: 0.7 },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Ollama response body is not readable");

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
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line) as OllamaChatResponse;
            if (data.message?.content) {
              fullContent += data.message.content;
              onChunk?.(data.message.content);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }
}
