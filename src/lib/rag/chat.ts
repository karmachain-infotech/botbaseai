import { getAdminClient } from "../supabase/admin";
import { searchSimilarChunks } from "./search";
import { generateStream } from "../llm";
import { handleServerError, NotFoundError, DatabaseError, ValidationError } from "../errors";
import type { Chatbot } from "../../types/database";

interface ChatRequest {
  chatbotId: string;
  message: string;
  sessionId: string;
  conversationId?: string;
  chatbot?: Chatbot;
}

interface ChatResponse {
  conversationId: string;
  content: string;
}

const responseCache = new Map<string, { content: string; expiry: number }>();
const CACHE_TTL = 30_000;

const greetingPattern = /^(hi|hello|hey|heyy|helloo|howdy|sup|yo)\W*$/i;
const thanksPattern = /^(thanks|thank you|ty|thx|thankyou)\W*$/i;

async function checkAndDeductCredit(userId: string): Promise<void> {
  const supabase = getAdminClient();
  // Use raw SQL for atomic check-and-deduct
  const { error } = await supabase.rpc("deduct_message_credit", { p_user_id: userId } as never);
  if (error) {
    // If RPC doesn't exist, the error message may contain "function not found"
    // fall back to the safe read-check-write pattern
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("message_credits_used, message_credits_limit")
      .eq("id", userId)
      .single();
    if (fetchErr || !user) return;
    const u = user as unknown as { message_credits_used: number; message_credits_limit: number };
    if (u.message_credits_used >= u.message_credits_limit) {
      throw new ValidationError("Message credits exhausted. Please upgrade your plan.");
    }
    const { error: updateErr } = await supabase
      .from("users")
      .update({ message_credits_used: u.message_credits_used + 1 } as never)
      .eq("id", userId);
    if (updateErr) {
      console.error("[checkAndDeductCredit] Update failed:", updateErr.message);
    }
  }
}

export async function streamChat(
  req: ChatRequest,
  onChunk?: (text: string) => void,
): Promise<ChatResponse> {
  const supabase = getAdminClient();

  const bot: Chatbot = req.chatbot ?? await (async () => {
    const { data, error } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", req.chatbotId)
      .single();
    if (error) throw new DatabaseError(error.message);
    if (!data) throw new NotFoundError("Chatbot");
    return data as unknown as Chatbot;
  })();

  // Check credit limit before processing and deduct immediately
  await checkAndDeductCredit(bot.user_id);

  let conversationId = req.conversationId;
  if (!conversationId) {
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ chatbot_id: req.chatbotId, session_id: req.sessionId } as never)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    if (!conv) throw new Error("Failed to create conversation");
    conversationId = (conv as unknown as { id: string }).id;
  }

  // Fast-path: skip LLM for simple greetings/thanks on first message
  if (greetingPattern.test(req.message)) {
    await Promise.all([
      supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: req.message } as never),
      supabase.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: "Hi there! 👋 Welcome! How can I help you today?" } as never),
      supabase.from("chatbots").update({ message_count: (bot.message_count ?? 0) + 1 } as never).eq("id", req.chatbotId),
    ]);
    const greeting = "Hi there! 👋 Welcome! How can I help you today?";
    onChunk?.(greeting);
    return { conversationId: conversationId!, content: greeting };
  }

  if (thanksPattern.test(req.message)) {
    await Promise.all([
      supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: req.message } as never),
      supabase.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: "You're welcome! 😊 Happy to help. Let me know if you need anything else!" } as never),
      supabase.from("chatbots").update({ message_count: (bot.message_count ?? 0) + 1 } as never).eq("id", req.chatbotId),
    ]);
    const thanks = "You're welcome! 😊 Happy to help. Let me know if you need anything else!";
    onChunk?.(thanks);
    return { conversationId: conversationId!, content: thanks };
  }

  // Response cache: same message within 30s
  const cacheKey = `${req.chatbotId}:${req.message}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    onChunk?.(cached.content);
    return { conversationId: conversationId!, content: cached.content };
  }

  const [history, chunks] = await Promise.all([
    supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(3)
      .then(({ data, error }) => {
        if (error) throw new DatabaseError(error.message);
        return (data ?? []) as unknown as { role: string; content: string }[];
      }),
    searchSimilarChunks(req.chatbotId, req.message),
  ]);

  let context = chunks.map((c) => c.content).join("\n\n").slice(0, 800);

  if (!context) {
    const { data: fallbackChunks, error: fallbackErr } = await supabase
      .from("embeddings")
      .select("content")
      .eq("chatbot_id", req.chatbotId)
      .limit(5);
    if (!fallbackErr && fallbackChunks && fallbackChunks.length > 0) {
      context = (fallbackChunks as unknown as { content: string }[])
        .map((c) => c.content).join("\n\n").slice(0, 800);
    }
  }

  const botName = bot.name || "Support Agent";
  const instructions = (bot.instructions || "").slice(0, 1000);

  const systemInstruction = `You are a helpful assistant. Answer the user's questions based on the CONTEXT provided below.

${instructions ? `=== GUIDELINES ===\n${instructions}\n\n` : ""}=== CONTEXT ===
${context || "No relevant context found."}

If the user asks about your name or identity, look for the answer in the CONTEXT above.

Keep responses short, warm, and helpful. Use emojis naturally.`;

  const msgs = (history ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content.length > 500 ? m.content.slice(0, 500) + "..." : m.content,
  }));

  await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: req.message } as never);

  const startTime = Date.now();

  const fullContent = await generateStream(
    {
      model: bot.model,
      systemInstruction,
      messages: [...msgs, { role: "user" as const, content: req.message }],
    },
    onChunk,
  );

  responseCache.set(cacheKey, { content: fullContent, expiry: Date.now() + CACHE_TTL });

  const responseTime = Date.now() - startTime;

  const newMsgCount = bot.message_count ?? 0;

  await Promise.all([
    supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: fullContent,
      tokens_used: fullContent.split(/\s+/).length,
      response_time_ms: responseTime,
      sources_used: chunks.map((c) => ({
        sourceId: c.source_id,
        chunkContent: c.content.slice(0, 200),
      })),
    } as never),
    supabase.from("chatbots").update({ message_count: newMsgCount + 1 } as never).eq("id", req.chatbotId),
  ]);

  return {
    conversationId: conversationId!,
    content: fullContent,
  };
}
