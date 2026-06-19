import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProviderInterface, AIChatParams } from "./types";

export class GeminiProvider implements AIProviderInterface {
  private client: GoogleGenerativeAI;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY environment variable is not set");
    this.client = new GoogleGenerativeAI(key);
  }

  async generateStream(
    params: AIChatParams,
    onChunk?: (text: string) => void,
  ): Promise<string> {
    const modelsToTry = [
      params.model,
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
    ].filter(Boolean) as string[];

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
          const model = this.client.getGenerativeModel({
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
          const isRateLimit =
            err && typeof err === "object" && "status" in err && (err as { status: number }).status === 429;
          if (isRateLimit && attempt < 2) {
            const delay = (attempt + 1) * 2000;
            console.error(`[Gemini] Model ${modelName} rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/3):`, err);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          lastError = err;
          console.error(`[Gemini] Model ${modelName} failed:`, err);
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
        console.error("[Gemini] Stream error:", streamError);
      }
    }

    if (!fullContent) {
      if (lastError) {
        console.error("[Gemini] API error:", lastError);
        fullContent = "The AI service is currently unavailable. Check your GEMINI_API_KEY or try again later.";
      } else {
        fullContent = "Sorry, I couldn't generate a response.";
      }
      onChunk?.(fullContent);
    }

    return fullContent;
  }
}
