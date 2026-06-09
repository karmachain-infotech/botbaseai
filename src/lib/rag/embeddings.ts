import { pipeline } from "@xenova/transformers";
import { ExternalServiceError, handleServerError } from "../errors";

let extractor: Awaited<ReturnType<typeof pipeline>> | null = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractor;
}

const EMBEDDING_DIMS = 384;

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const e = await getExtractor();
    const result = await e(text, { pooling: "mean", normalize: true });
    return Array.from(result.data);
  } catch (error) {
    console.error("[createEmbedding] Original error:", error);
    throw handleServerError(
      new ExternalServiceError("Embedding", "Failed to create embedding. Please try again."),
      "createEmbedding",
    );
  }
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    return await Promise.all(texts.map((text) => createEmbedding(text)));
  } catch (error) {
    console.error("[createEmbeddings] Original error:", error);
    throw handleServerError(
      new ExternalServiceError("Embedding", "Failed to create embeddings. Please try again."),
      "createEmbeddings",
    );
  }
}

export { EMBEDDING_DIMS };
