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
  threshold = 0.25,
  count = 5,
): Promise<SearchResult[]> {
  const supabase = getAdminClient();

  // Try vector search first
  let queryEmbedding: number[];
  try {
    queryEmbedding = await createEmbedding(query);
  } catch (err) {
    console.error("[searchSimilarChunks] Embedding failed:", err);
    return keywordSearch(supabase, chatbotId, query, count);
  }

  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_chatbot_id: chatbotId,
    match_threshold: threshold,
    match_count: count,
  });

  if (!error && data && data.length > 0) {
    return data as SearchResult[];
  }

  if (error) {
    console.error("[searchSimilarChunks] Vector search error:", error);
  }

  return keywordSearch(supabase, chatbotId, query, count);
}

async function keywordSearch(
  supabase: ReturnType<typeof getAdminClient>,
  chatbotId: string,
  query: string,
  count: number,
): Promise<SearchResult[]> {
  try {
    const queryWords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (queryWords.length === 0) return [];

    const { data, error } = await supabase
      .from("embeddings")
      .select("id, chatbot_id, source_id, content, metadata")
      .eq("chatbot_id", chatbotId)
      .limit(500);

    if (error || !data || data.length === 0) return [];

    const scored = (data as { id: string; chatbot_id: string; source_id: string; content: string; metadata: Record<string, unknown> }[])
      .map((row) => {
        const contentLower = row.content.toLowerCase();
        let matches = 0;
        for (const word of queryWords) {
          if (contentLower.includes(word)) matches++;
        }
        return {
          ...row,
          similarity: matches / queryWords.length,
        };
      })
      .filter((r) => r.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, count);

    return scored;
  } catch (err) {
    console.error("[keywordSearch] Error:", err);
    return [];
  }
}
