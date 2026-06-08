import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { AuthError, DatabaseError, handleServerError } from "../errors";

export const getAnalytics = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      chatbotId: z.string().uuid(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();
      const admin = getAdminClient();

      const startDate = data.startDate
        ? new Date(data.startDate).toISOString()
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = data.endDate
        ? new Date(data.endDate).toISOString()
        : new Date().toISOString();

      // Total conversations
      const { count: totalConversations, error: convErr } = await admin
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("chatbot_id", data.chatbotId)
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (convErr) throw new DatabaseError(convErr.message);

      // Fetch conversation IDs for message queries
      const { data: convIds, error: idsErr } = await admin
        .from("conversations")
        .select("id")
        .eq("chatbot_id", data.chatbotId)
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (idsErr) throw new DatabaseError(idsErr.message);

      const ids = (convIds ?? []).map((c: { id: string }) => c.id);

      let messageCount = 0;
      let avgResponseTime = 0;

      if (ids.length > 0) {
        const { data: messages, error: msgErr } = await admin
          .from("messages")
          .select("response_time_ms, role")
          .in("conversation_id", ids);
        if (msgErr) throw new DatabaseError(msgErr.message);

        messageCount = messages?.length ?? 0;
        const assistantMsgs = messages?.filter((m: { role: string }) => m.role === "assistant") ?? [];
        avgResponseTime = assistantMsgs.length > 0
          ? Math.round(assistantMsgs.reduce((sum: number, m: { response_time_ms: number }) => sum + (m.response_time_ms ?? 0), 0) / assistantMsgs.length)
          : 0;
      }

      // Ratings
      const { data: ratedConvs, error: ratingErr } = await admin
        .from("conversations")
        .select("rating")
        .eq("chatbot_id", data.chatbotId)
        .not("rating", "is", null);
      if (ratingErr) throw new DatabaseError(ratingErr.message);

      const ratings = (ratedConvs ?? []).map((c: { rating: number | null }) => c.rating).filter(Boolean) as number[];
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 0;

      // Escalation rate
      const { count: escalatedCount, error: escErr } = await admin
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("chatbot_id", data.chatbotId)
        .eq("escalated", true)
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (escErr) throw new DatabaseError(escErr.message);

      const escalationRate = (totalConversations ?? 0) > 0
        ? Math.round(((escalatedCount ?? 0) / (totalConversations ?? 0)) * 100)
        : 0;

      // Resolution rate
      const { count: resolvedCount, error: resErr } = await admin
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("chatbot_id", data.chatbotId)
        .eq("status", "resolved")
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (resErr) throw new DatabaseError(resErr.message);

      const resolutionRate = (totalConversations ?? 0) > 0
        ? Math.round(((resolvedCount ?? 0) / (totalConversations ?? 0)) * 100)
        : 0;

      // Top questions (most frequent user messages)
      const { data: userMessages, error: umErr } = await admin
        .from("messages")
        .select("content")
        .in("conversation_id", ids)
        .eq("role", "user");
      if (umErr) throw new DatabaseError(umErr.message);

      const questionFrequency: Record<string, number> = {};
      (userMessages ?? []).forEach((m: { content: string }) => {
        const q = m.content.toLowerCase().trim();
        questionFrequency[q] = (questionFrequency[q] ?? 0) + 1;
      });

      const topQuestions = Object.entries(questionFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([question, count]) => ({ question, count }));

      return {
        totalConversations: totalConversations ?? 0,
        totalMessages: messageCount,
        avgResponseTime,
        csatScore: avgRating,
        escalationRate,
        resolutionRate,
        topQuestions,
      };
    } catch (error) {
      throw handleServerError(error, "getAnalytics");
    }
  });

export const getMessageVolume = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      chatbotId: z.string().uuid(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      granularity: z.enum(["day", "week", "month"]).default("day"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();
      const admin = getAdminClient();

      const startDate = data.startDate
        ? new Date(data.startDate).toISOString()
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = data.endDate
        ? new Date(data.endDate).toISOString()
        : new Date().toISOString();

      const { data: convIds, error: idsErr } = await admin
        .from("conversations")
        .select("id")
        .eq("chatbot_id", data.chatbotId)
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (idsErr) throw new DatabaseError(idsErr.message);

      const ids = (convIds ?? []).map((c: { id: string }) => c.id);
      if (ids.length === 0) return { volume: [] };

      const { data: messages, error: msgErr } = await admin
        .from("messages")
        .select("created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true });
      if (msgErr) throw new DatabaseError(msgErr.message);

      const volume: Record<string, number> = {};
      (messages ?? []).forEach((m: { created_at: string }) => {
        let key: string;
        const d = new Date(m.created_at);
        if (data.granularity === "day") {
          key = d.toISOString().slice(0, 10);
        } else if (data.granularity === "week") {
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          key = weekStart.toISOString().slice(0, 10);
        } else {
          key = d.toISOString().slice(0, 7);
        }
        volume[key] = (volume[key] ?? 0) + 1;
      });

      return {
        volume: Object.entries(volume).map(([date, count]) => ({ date, count })),
      };
    } catch (error) {
      throw handleServerError(error, "getMessageVolume");
    }
  });

export const getUnansweredQuestions = createServerFn({ method: "GET" })
  .inputValidator(z.object({ chatbotId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();
      const admin = getAdminClient();

      const { data: convIds, error: idsErr } = await admin
        .from("conversations")
        .select("id")
        .eq("chatbot_id", data.chatbotId)
        .neq("status", "resolved");
      if (idsErr) throw new DatabaseError(idsErr.message);

      const ids = (convIds ?? []).map((c: { id: string }) => c.id);
      if (ids.length === 0) return { unanswered: [] };

      const { data: messages, error: msgErr } = await admin
        .from("messages")
        .select("content, conversation_id")
        .in("conversation_id", ids)
        .eq("role", "assistant");
      if (msgErr) throw new DatabaseError(msgErr.message);

      const unansweredMessages = (messages ?? []).filter((m: { content: string }) => {
        const lower = m.content.toLowerCase();
        return (
          lower.includes("i don't know") ||
          lower.includes("i don't have") ||
          lower.includes("i'm not sure") ||
          lower.includes("i cannot") ||
          lower.includes("i am not able") ||
          lower.includes("i don't understand")
        );
      });

      return { unanswered: unansweredMessages };
    } catch (error) {
      throw handleServerError(error, "getUnansweredQuestions");
    }
  });
