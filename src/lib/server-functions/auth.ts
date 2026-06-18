import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { CREDIT_LIMITS } from "../stripe";
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

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: data.name },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          throw new ValidationError("An account with this email already exists");
        }
        throw new DatabaseError(authError.message);
      }

      const { error: dbError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: data.email,
        name: data.name,
        plan: "free",
        message_credits_limit: CREDIT_LIMITS.free,
      });

      if (dbError) throw new DatabaseError(dbError.message);

      return { userId: authData.user.id };
    } catch (error) {
      throw handleServerError(error, "signup");
    }
  });

export const login = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const supabase = getAdminClient();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          throw new ValidationError("Invalid email or password");
        }
        throw new DatabaseError(authError.message);
      }

      return { session: authData.session, user: authData.user };
    } catch (error) {
      throw handleServerError(error, "login");
    }
  });

export const googleAuth = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const supabase = getAdminClient();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        },
      });

      if (error) throw new DatabaseError(error.message);
      return { url: data.url };
    } catch (error) {
      throw handleServerError(error, "googleAuth");
    }
  });

export const refreshSession = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
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
  });

export const getSession = createServerFn({ method: "GET" })
  .handler(async () => {
    return { authenticated: true };
  });
