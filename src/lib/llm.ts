import type { AIProvider, AIProviderInterface, AIChatParams } from "./ai/types";
import { GroqProvider } from "./ai/groq";
import { GeminiProvider } from "./ai/gemini";
import { OllamaProvider } from "./ai/ollama";

export type { AIProvider, AIChatParams };

const providerCache = new Map<AIProvider, AIProviderInterface>();

export function getAIProvider(): AIProvider {
  const raw = process.env.AI_PROVIDER;
  if (raw === "groq" || raw === "ollama" || raw === "gemini") return raw;
  return "groq";
}

function createProvider(provider?: AIProvider): AIProviderInterface {
  const p = provider || getAIProvider();
  const cached = providerCache.get(p);
  if (cached) return cached;

  let instance: AIProviderInterface;
  switch (p) {
    case "groq":
      instance = new GroqProvider();
      break;
    case "gemini":
      instance = new GeminiProvider();
      break;
    case "ollama":
      instance = new OllamaProvider();
      break;
    default:
      instance = new GroqProvider();
  }

  providerCache.set(p, instance);
  return instance;
}

export async function generateStream(
  params: AIChatParams,
  onChunk?: (text: string) => void,
): Promise<string> {
  const provider = createProvider();
  return provider.generateStream(params, onChunk);
}
