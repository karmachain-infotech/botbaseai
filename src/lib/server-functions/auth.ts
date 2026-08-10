import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { getCreditLimits, fireNotificationWebhook } from "./settings";
import { DatabaseError, ValidationError, handleServerError } from "../errors";

export const signup = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = getAdminClient();

      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: { name: data.name },
        });

      if (authError) {
        if (authError.message.includes("already registered")) {
          throw new ValidationError(
            "An account with this email already exists",
          );
        }
        throw new DatabaseError(authError.message);
      }

      const [limits] = await Promise.all([getCreditLimits()]);
      const { error: dbError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: data.email,
        name: data.name,
        plan: "free",
        message_credits_limit: limits.free,
      });

      if (dbError) throw new DatabaseError(dbError.message);

      fireNotificationWebhook("user.signup", {
        userId: authData.user.id,
        email: data.email,
        name: data.name,
      });

      return { userId: authData.user.id };
    } catch (error) {
      throw handleServerError(error, "signup");
    }
  });

export const refreshSession = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const supabase = await createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // Force token refresh to trigger setAll (writes non-HttpOnly cookies)
        await supabase.auth.setSession(session);
        return { ok: true };
      }
      return { ok: false };
    } catch (e) {
      console.error("refreshSession error:", e);
      return { ok: false };
    }
  },
);

export const ensureUserExists = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return { created: false, error: "Not authenticated" };
      }

      const admin = getAdminClient();
      const [limits] = await Promise.all([getCreditLimits()]);
      const { error: upsertError } = await admin.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          name:
            user.user_metadata?.name ??
            user.user_metadata?.full_name ??
            user.email?.split("@")[0] ??
            "User",
          avatar_url:
            user.user_metadata?.avatar_url ??
            user.user_metadata?.picture ??
            null,
          plan: "free",
          message_credits_limit: limits.free,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );

      if (upsertError) {
        console.error("[ensureUserExists] Upsert error:", upsertError.message);
        return { created: false, error: upsertError.message };
      }

      fireNotificationWebhook("user.signup", {
        userId: user.id,
        email: user.email,
        name: user.user_metadata?.name,
      });

      return { created: true };
    } catch (error) {
      console.error("[ensureUserExists] Error:", error);
      return { created: false, error: "Failed to ensure user exists" };
    }
  },
);
