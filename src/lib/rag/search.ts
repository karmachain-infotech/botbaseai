import { getAdminClient } from "../supabase/admin";
import { createEmbedding } from "./embeddings";

export interface SearchResult {
  id: string;
  chatbot_id: string;
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function searchSimilarChunks(
  chatbotId: string,
  query: string,
  threshold = 0.7,
  count = 5,
): Promise<SearchResult[]> {
  const supabase = getAdminClient();

  let queryEmbedding: number[];
  let embeddingFailed = false;
  try {
    queryEmbedding = await createEmbedding(query);
  } catch (err) {
    console.error("[searchSimilarChunks] Embedding failed, falling back to keyword search:", err);
    embeddingFailed = true;
    queryEmbedding = [];
  }

  if (!embeddingFailed) {
    const { data, error } = await supabase.rpc("match_embeddings", {
      query_embedding: queryEmbedding,
      match_chatbot_id: chatbotId,
      match_threshold: threshold,
      match_count: count,
    });

    if (error) {
      console.error("Vector search error:", error);
    }

    if (!error && data && data.length > 0) {
      return data as SearchResult[];
    }
  }

  // Fallback: keyword search on content column
  try {
    const { data, error } = await supabase
      .from("embeddings")
      .select("id, chatbot_id, source_id, content, metadata")
      .eq("chatbot_id", chatbotId)
      .ilike("content", `%${query}%`)
      .limit(count);

    if (!error && data) {
      return (data as SearchResult[]).map((r) => ({ ...r, similarity: 0 }));
    }
  } catch (err) {
    console.error("[searchSimilarChunks] Keyword search error:", err);
  }

  return [];
}
