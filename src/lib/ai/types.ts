export type AIProvider = "groq" | "ollama" | "gemini";

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatParams {
  model?: string;
  systemInstruction?: string;
  messages: AIChatMessage[];
}

export interface AIProviderInterface {
  generateStream(
    params: AIChatParams,
    onChunk?: (text: string) => void,
  ): Promise<string>;
}
