import { getGeminiClient } from "../gemini";
import { ExternalServiceError, handleServerError } from "../errors";

const EMBEDDING_MODEL = "embedding-001";

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent({
      content: { parts: [{ text }] },
    });
    return result.embedding.values;
  } catch (error) {
    console.error("[createEmbedding] Original error:", error);
    throw handleServerError(
      new ExternalServiceError("Gemini", "Failed to create embedding. Please try again."),
      "createEmbedding",
    );
  }
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.batchEmbedContents({
      requests: texts.map((t) => ({
        content: { parts: [{ text: t }] },
      })),
    });
    return result.embeddings.map((e) => e.values);
  } catch (error) {
    console.error("[createEmbeddings] Original error:", error);
    throw handleServerError(
      new ExternalServiceError("Gemini", "Failed to create embeddings. Please try again."),
      "createEmbeddings",
    );
  }
}
