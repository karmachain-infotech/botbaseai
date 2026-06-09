import { getGeminiClient } from "../gemini";
import { getAdminClient } from "../supabase/admin";
import { searchSimilarChunks } from "./search";
import { handleServerError, NotFoundError, DatabaseError, ExternalServiceError } from "../errors";
import type { Chatbot } from "../../types/database";

interface ChatRequest {
  chatbotId: string;
  message: string;
  sessionId: string;
  conversationId?: string;
}

interface ChatResponse {
  conversationId: string;
  content: string;
}

export async function streamChat(
  req: ChatRequest,
  onChunk?: (text: string) => void,
): Promise<ChatResponse> {
  const supabase = getAdminClient();
  const genAI = getGeminiClient();

  let chatbotData: unknown;
  try {
    const { data, error } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", req.chatbotId)
      .single();
    if (error) throw new DatabaseError(error.message);
    if (!data) throw new NotFoundError("Chatbot");
    chatbotData = data;
  } catch (error) {
    throw handleServerError(error, "streamChat:fetchBot");
  }

  const bot = chatbotData as unknown as Chatbot;

  let conversationId = req.conversationId;
  if (!conversationId) {
    try {
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          chatbot_id: req.chatbotId,
          session_id: req.sessionId,
        })
        .select()
        .single();

      if (error) throw new DatabaseError(error.message);
      if (!conv) throw new Error("Failed to create conversation");
      conversationId = conv.id;
    } catch (error) {
      throw handleServerError(error, "streamChat:createConversation");
    }
  }

  let history;
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(10);
    if (error) throw new DatabaseError(error.message);
    history = data;
  } catch (error) {
    throw handleServerError(error, "streamChat:fetchHistory");
  }

  const chunks = await searchSimilarChunks(req.chatbotId, req.message);
  const context = chunks.map((c) => c.content).join("\n\n");

  const botName = bot.name || "Support Agent";
  const instructions = bot.instructions || "";

  const systemInstruction = `You are ${botName}, a customer support AI agent. Never say you are an AI model, a large language model, or that you were trained by Google. You represent this business only.

${instructions ? `=== COMPANY INFORMATION & GUIDELINES ===\n${instructions}\n\n` : ""}=== KNOWLEDGE BASE CONTEXT ===
${context || "No relevant context retrieved from the knowledge base."}

Answer questions using ALL of the information above. First use the COMPANY INFORMATION & GUIDELINES section, then the KNOWLEDGE BASE CONTEXT. If neither contains enough information to answer the question, say "I don't have enough information about that" - do NOT make up answers.`;

  const geminiHistory = (history ?? []).map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));

  supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: req.message,
  }).then(() => {}).catch((err) => {
    console.error("[streamChat] Failed to save user message:", err);
  });

  const modelsToTry = [bot.model, "gemini-2.0-flash", "gemini-1.5-flash"];

  const startTime = Date.now();
  let streamResult;
  let geminiError: unknown;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });
        streamResult = await model.generateContentStream({
          contents: [
            ...geminiHistory,
            { role: "user", parts: [{ text: req.message }] },
          ],
        });
        break;
      } catch (err) {
        const isRateLimit = err && typeof err === "object" && "status" in err && (err as { status: number }).status === 429;
        if (isRateLimit && attempt < 2) {
          const delay = (attempt + 1) * 2000;
          console.error(`[streamChat] Model ${modelName} rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/3):`, err);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        geminiError = err;
        console.error(`[streamChat] Model ${modelName} failed:`, err);
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
      console.error("[streamChat] Stream error:", streamError);
    }
  }

  if (!fullContent) {
    if (geminiError) {
      console.error("[streamChat] Gemini chat API error:", geminiError);
      const msg = "The AI service is currently unavailable. Check your GEMINI_API_KEY or try again later.";
      fullContent = msg;
      onChunk?.(msg);
    } else {
      fullContent = "Sorry, I couldn't generate a response.";
      onChunk?.(fullContent);
    }
  }

  const responseTime = Date.now() - startTime;

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
  }).then(() => {}).catch((err) => {
    console.error("[streamChat] Failed to save assistant message:", err);
  });

  supabase
    .from("users")
    .update({ message_credits_used: bot.message_count + 1 })
    .eq("id", bot.user_id)
    .then(() => {}).catch((err) => {
      console.error("[streamChat] Failed to decrement credits:", err);
    });

  supabase
    .from("chatbots")
    .update({ message_count: (bot.message_count ?? 0) + 1 })
    .eq("id", req.chatbotId)
    .then(() => {}).catch((err) => {
      console.error("[streamChat] Failed to increment message count:", err);
    });

  return {
    conversationId,
    content: fullContent,
  };
}
