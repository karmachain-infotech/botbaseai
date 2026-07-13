import { ExternalServiceError, handleServerError } from "../errors";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 384;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY environment variable is not set");
  return key;
}

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${MODEL}:embedContent?key=${getApiKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: EMBEDDING_DIMS,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini embedContent failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as {
      embedding?: { values?: number[] };
    };
    const values = data.embedding?.values;
    if (!values || values.length === 0) {
      throw new Error("Gemini returned empty embedding");
    }
    return values;
  } catch (error) {
    console.error("[createEmbedding] Original error:", error);
    throw handleServerError(
      new ExternalServiceError(
        "Embedding",
        "Failed to create embedding. Please try again.",
      ),
      "createEmbedding",
    );
  }
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const apiKey = getApiKey();
    const results = await Promise.all(
      texts.map((text) =>
        fetch(`${GEMINI_BASE}/models/${MODEL}:embedContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text }] },
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: EMBEDDING_DIMS,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const body = await res.text();
            throw new Error(
              `Gemini embedContent failed (${res.status}): ${body}`,
            );
          }
          const data = (await res.json()) as {
            embedding?: { values?: number[] };
          };
          const values = data.embedding?.values;
          if (!values || values.length === 0) {
            throw new Error("Gemini returned empty embedding");
          }
          return values;
        }),
      ),
    );
    return results;
  } catch (error) {
    console.error("[createEmbeddings] Original error:", error);
    throw handleServerError(
      new ExternalServiceError(
        "Embedding",
        "Failed to create embeddings. Please try again.",
      ),
      "createEmbeddings",
    );
  }
}

export { EMBEDDING_DIMS };
