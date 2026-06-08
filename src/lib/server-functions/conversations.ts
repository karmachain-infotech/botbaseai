import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { AuthError, DatabaseError, NotFoundError, handleServerError } from "../errors";

export const listConversations = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      chatbotId: z.string().uuid(),
      status: z.enum(["open", "resolved", "escalated"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      let query = admin
        .from("conversations")
        .select("id, session_id, user_identifier, status, escalated, rating, created_at, updated_at, messages(count)")
        .eq("chatbot_id", data.chatbotId)
        .order("created_at", { ascending: false })
        .range(data.offset, data.offset + data.limit - 1);

      if (data.status) {
        query = query.eq("status", data.status);
      }

      const { data: conversations, error } = await query;
      if (error) throw new DatabaseError(error.message);
      return conversations ?? [];
    } catch (error) {
      throw handleServerError(error, "listConversations");
    }
  });

export const getConversation = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();

      const { data: conversation, error: convErr } = await admin
        .from("conversations")
        .select("*")
        .eq("id", data.id)
        .single();

      if (convErr) throw new DatabaseError(convErr.message);
      if (!conversation) throw new NotFoundError("Conversation");

      const { data: messages, error: msgErr } = await admin
        .from("messages")
        .select("*")
        .eq("conversation_id", data.id)
        .order("created_at", { ascending: true });

      if (msgErr) throw new DatabaseError(msgErr.message);
      return { conversation, messages: messages ?? [] };
    } catch (error) {
      throw handleServerError(error, "getConversation");
    }
  });

export const updateConversationStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["open", "resolved", "escalated"]),
      rating: z.number().min(1).max(5).optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const updateData: Record<string, unknown> = { status: data.status };
      if (data.rating !== undefined) {
        updateData.rating = data.rating;
      }

      const { error } = await admin
        .from("conversations")
        .update(updateData)
        .eq("id", data.id);

      if (error) throw new DatabaseError(error.message);
      return { success: true };
    } catch (error) {
      throw handleServerError(error, "updateConversationStatus");
    }
  });
