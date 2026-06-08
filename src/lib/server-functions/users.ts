import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { AuthError, DatabaseError, NotFoundError, ValidationError, handleServerError } from "../errors";

export const getUserProfile = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const { data: profile, error } = await admin
        .from("users")
        .select("id, email, name, avatar_url, plan, message_credits_used, message_credits_limit, stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (error) throw new DatabaseError(error.message);
      if (!profile) throw new NotFoundError("User profile");
      return profile;
    } catch (error) {
      throw handleServerError(error, "getUserProfile");
    }
  });

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(100).optional(),
      avatar_url: z.string().url().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();
      const updates: Record<string, unknown> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;

      if (Object.keys(updates).length === 0) return { updated: false };

      const { error } = await admin.from("users").update(updates).eq("id", user.id);
      if (error) throw new DatabaseError(error.message);
      return { updated: true };
    } catch (error) {
      throw handleServerError(error, "updateProfile");
    }
  });

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: data.currentPassword,
      });
      if (signInError) throw new ValidationError("Current password is incorrect");

      const admin = getAdminClient();
      const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
        password: data.newPassword,
      });
      if (updateError) throw new DatabaseError(updateError.message);
      return { updated: true };
    } catch (error) {
      throw handleServerError(error, "changePassword");
    }
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new AuthError();

      const admin = getAdminClient();

      const tables = ["conversations", "messages", "sources", "embeddings", "ai_actions", "chatbots"];
      for (const table of tables) {
        await admin.from(table as "chatbots").delete().eq("user_id", user.id).maybeSingle();
      }

      const { error: profileError } = await admin.from("users").delete().eq("id", user.id);
      if (profileError) console.error("Failed to delete profile:", profileError.message);

      const { error: authError2 } = await admin.auth.admin.deleteUser(user.id);
      if (authError2) throw new DatabaseError(authError2.message);

      return { deleted: true };
    } catch (error) {
      throw handleServerError(error, "deleteAccount");
    }
  });
