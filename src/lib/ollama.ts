interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
}

export async function ollamaStreamChat(
  params: {
    model?: string;
    system?: string;
    prompt: string;
    history?: { role: string; content: string }[];
  },
  onChunk?: (text: string) => void,
): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = params.model;

  const messages: OllamaChatMessage[] = [];

  if (params.system) {
    messages.push({ role: "system", content: params.system });
  }

  if (params.history) {
    for (const msg of params.history) {
      const role = msg.role === "model" ? "assistant" : msg.role;
      messages.push({ role: role as "user" | "assistant", content: msg.content });
    }
  }

  messages.push({ role: "user", content: params.prompt });

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      keep_alive: "5m",
      options: {
        num_predict: 512,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`);
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
          // skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}
