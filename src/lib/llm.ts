import { GoogleGenerativeAI } from "@google/generative-ai";
import { ollamaStreamChat } from "./ollama";

export type LLMProvider = "gemini" | "ollama";

interface StreamChatParams {
  model?: string;
  systemInstruction?: string;
  messages: { role: string; content: string }[];
}

export function getLLMProvider(): LLMProvider {
  const ollamaEnabled = process.env.OLLAMA_ENABLED === "true";
  if (ollamaEnabled) return "ollama";
  return "gemini";
}

export async function generateStream(
  params: StreamChatParams,
  onChunk?: (text: string) => void,
): Promise<string> {
  const provider = getLLMProvider();

  if (provider === "ollama") {
    return generateOllamaStream(params, onChunk);
  }

  return generateGeminiStream(params, onChunk);
}

async function generateGeminiStream(
  params: StreamChatParams,
  onChunk?: (text: string) => void,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const genAI = new GoogleGenerativeAI(key);
  const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"].filter(Boolean) as string[];

  const history = (params.messages ?? []).map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));

  const lastUserMsg = history.pop();

  let streamResult;
  let lastError: unknown;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: params.systemInstruction,
        });
        streamResult = await model.generateContentStream({
          contents: [
            ...history,
            { role: "user" as const, parts: [{ text: lastUserMsg?.parts[0].text || "" }] },
          ],
        });
        break;
      } catch (err) {
        const isRateLimit = err && typeof err === "object" && "status" in err && (err as { status: number }).status === 429;
        if (isRateLimit && attempt < 2) {
          const delay = (attempt + 1) * 2000;
          console.error(`[LLM] Gemini model ${modelName} rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/3):`, err);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        lastError = err;
        console.error(`[LLM] Gemini model ${modelName} failed:`, err);
        break;
      }
    }
    if (streamResult) break;
  }

  let fullContent = "";
  if (streamResult) {
    try {
      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) {
          fullContent += text;
          onChunk?.(text);
        }
      }
    } catch (streamError) {
      console.error("[LLM] Gemini stream error:", streamError);
    }
  }

  if (!fullContent) {
    if (lastError) {
      console.error("[LLM] Gemini chat API error:", lastError);
      fullContent = "The AI service is currently unavailable. Check your GEMINI_API_KEY or try again later.";
      onChunk?.(fullContent);
    } else {
      fullContent = "Sorry, I couldn't generate a response.";
      onChunk?.(fullContent);
    }
  }

  return fullContent;
}

async function generateOllamaStream(
  params: StreamChatParams,
  onChunk?: (text: string) => void,
): Promise<string> {
  const system = params.systemInstruction;
  const messages = params.messages ?? [];

  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  const history = messages.slice(0, -1);

  return ollamaStreamChat(
    {
      model: process.env.OLLAMA_MODEL || "llama3",
      system,
      prompt: lastUserMsg?.content || "",
      history: history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    },
    onChunk,
  );
}
