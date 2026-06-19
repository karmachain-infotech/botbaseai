// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { AuthError, DatabaseError, NotFoundError, handleServerError } from "../errors";

export const listChatbots = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { data, error } = await admin
        .from("chatbots")
        .select("id, name, status, message_count, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw new DatabaseError(error.message);
      return data ?? [];
    } catch (error) {
      throw handleServerError(error, "listChatbots");
    }
  });

export const getChatbot = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { data: chatbot, error } = await admin
        .from("chatbots")
        .select("*")
        .eq("id", data.id)
        .eq("user_id", user.id)
        .single();

      if (error) throw new DatabaseError(error.message);
      if (!chatbot) throw new NotFoundError("Chatbot");
      return chatbot;
    } catch (error) {
      throw handleServerError(error, "getChatbot");
    }
  });

export const createChatbot = createServerFn({ method: "POST" })
    .inputValidator(
      z.object({
        name: z.string().min(1).max(100),
        instructions: z.string().optional(),
        model: z.string().optional(),
        language: z.string().optional(),
        status: z.enum(["draft", "live"]).optional(),
        widget_config: z.record(z.unknown()).optional(),
      }),
    )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { data: chatbot, error } = await admin
        .from("chatbots")
        .insert({
          user_id: user.id,
          name: data.name,
          instructions: data.instructions ?? "",
          model: data.model ?? "gemini-2.5-flash",
          language: data.language ?? "en",
          status: data.status ?? "draft",
          widget_config: data.widget_config ?? {},
        })
        .select()
        .single();

      if (error) throw new DatabaseError(error.message);
      return chatbot;
    } catch (error) {
      throw handleServerError(error, "createChatbot");
    }
  });

export const updateChatbot = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      instructions: z.string().optional(),
      model: z.string().optional(),
      language: z.string().optional(),
      status: z.enum(["draft", "live"]).optional(),
      widget_config: z.record(z.unknown()).optional(),
      allowed_domains: z.array(z.string()).optional(),
      escalation_rules: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { data: chatbot, error } = await admin
        .from("chatbots")
        .update(data)
        .eq("id", data.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw new DatabaseError(error.message);
      if (!chatbot) throw new NotFoundError("Chatbot");
      return chatbot;
    } catch (error) {
      throw handleServerError(error, "updateChatbot");
    }
  });

export const deleteChatbot = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { error } = await admin
        .from("chatbots")
        .delete()
        .eq("id", data.id)
        .eq("user_id", user.id);

      if (error) throw new DatabaseError(error.message);
      return { success: true };
    } catch (error) {
      throw handleServerError(error, "deleteChatbot");
    }
  });
