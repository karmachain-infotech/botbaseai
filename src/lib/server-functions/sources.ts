import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { trainSource } from "../rag/train";
import { AuthError, DatabaseError, NotFoundError, ValidationError, handleServerError } from "../errors";

export const addSource = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      chatbotId: z.string().uuid(),
      type: z.enum(["file", "url", "text", "qa"]),
      name: z.string().min(1),
      content: z.string().optional(),
      fileBase64: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const sourceId = crypto.randomUUID();

      let content = data.content ?? "";
      let fileSize: number | null = null;

      if (data.type === "file" && data.fileBase64) {
        const buffer = Buffer.from(data.fileBase64, "base64");
        fileSize = buffer.length;

        const filePath = `${data.chatbotId}/${sourceId}/${data.name}`;
        const { error: uploadError } = await admin.storage.from("sources").upload(filePath, buffer);
        if (uploadError) throw new DatabaseError(`File upload failed: ${uploadError.message}`);

        content = filePath;
      }

      if (data.type === "qa" && content) {
        try {
          JSON.parse(content);
        } catch {
          throw new ValidationError("QA content must be valid JSON array of {question, answer} objects");
        }
      }

      const { data: source, error } = await admin
        .from("sources")
        .insert({
          id: sourceId,
          chatbot_id: data.chatbotId,
          type: data.type,
          name: data.name,
          content,
          file_size: fileSize,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw new DatabaseError(error.message);

      trainSource(sourceId).catch(console.error);

      return source;
    } catch (error) {
      throw handleServerError(error, "addSource");
    }
  });

export const listSources = createServerFn({ method: "GET" })
  .inputValidator(z.object({ chatbotId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { data: sources, error } = await admin
        .from("sources")
        .select("id, type, name, status, file_size, created_at")
        .eq("chatbot_id", data.chatbotId)
        .order("created_at", { ascending: false });

      if (error) throw new DatabaseError(error.message);
      return sources ?? [];
    } catch (error) {
      throw handleServerError(error, "listSources");
    }
  });

export const deleteSource = createServerFn({ method: "POST" })
  .inputValidator(z.object({ chatbotId: z.string().uuid(), sourceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { error } = await admin
        .from("sources")
        .delete()
        .eq("id", data.sourceId)
        .eq("chatbot_id", data.chatbotId);

      if (error) throw new DatabaseError(error.message);
      return { success: true };
    } catch (error) {
      throw handleServerError(error, "deleteSource");
    }
  });

export const getTrainingStatus = createServerFn({ method: "GET" })
  .inputValidator(z.object({ chatbotId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { data: sources, error } = await admin
        .from("sources")
        .select("id, name, type, status")
        .eq("chatbot_id", data.chatbotId);

      if (error) throw new DatabaseError(error.message);

      const list = sources ?? [];
      return {
        sources: list,
        allTrained: list.length > 0 && list.every((s) => s.status === "trained"),
        hasFailed: list.some((s) => s.status === "failed"),
      };
    } catch (error) {
      throw handleServerError(error, "getTrainingStatus");
    }
  });

export const retrainSource = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sourceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();

      const { data: source, error } = await admin
        .from("sources")
        .select("*, chatbots!inner(user_id)")
        .eq("id", data.sourceId)
        .single();

      if (error) throw new DatabaseError(error.message);
      if (!source) throw new NotFoundError("Source");

      await trainSource(data.sourceId);
      return { success: true };
    } catch (error) {
      throw handleServerError(error, "retrainSource");
    }
  });
