import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import {
  AuthError,
  DatabaseError,
  NotFoundError,
  handleServerError,
} from "../errors";
import type { Aiaction, AiactionMethod } from "../../types/database";

export const listActions = createServerFn({ method: "GET" })
  .inputValidator(z.object({ chatbotId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { data: actions, error } = await admin
        .from("ai_actions")
        .select("*")
        .eq("chatbot_id", data.chatbotId)
        .order("created_at", { ascending: false });

      if (error) throw new DatabaseError(error.message);
      return (actions ?? []) as unknown as Aiaction[];
    } catch (error) {
      throw handleServerError(error, "listActions");
    }
  });

export const createAction = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      chatbotId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional(),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]),
      url: z.string().min(1),
      headers: z.record(z.string()).optional(),
      body_template: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { data: action, error } = await admin
        .from("ai_actions")
        .insert({
          chatbot_id: data.chatbotId,
          name: data.name,
          description: data.description ?? "",
          method: data.method,
          url: data.url,
          headers: data.headers ?? {},
          body_template: data.body_template ?? null,
        })
        .select()
        .single();

      if (error) throw new DatabaseError(error.message);
      return action as unknown as Aiaction;
    } catch (error) {
      throw handleServerError(error, "createAction");
    }
  });

export const updateAction = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      enabled: z.boolean().optional(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
      url: z.string().optional(),
      headers: z.record(z.string()).optional(),
      body_template: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { data: action, error } = await admin
        .from("ai_actions")
        .update(data)
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw new DatabaseError(error.message);
      if (!action) throw new NotFoundError("Action");
      return action as unknown as Aiaction;
    } catch (error) {
      throw handleServerError(error, "updateAction");
    }
  });

export const deleteAction = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { error } = await admin
        .from("ai_actions")
        .delete()
        .eq("id", data.id);

      if (error) throw new DatabaseError(error.message);
      return { success: true };
    } catch (error) {
      throw handleServerError(error, "deleteAction");
    }
  });
