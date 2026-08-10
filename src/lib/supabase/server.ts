import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getRequest,
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";

export function createClient(): SupabaseClient {
  const request = getRequest();

  if (!request) {
    throw new Error("createClient() must be called from a server context");
  }

  const headers = getRequestHeaders();

  const cookieHeader = headers.get("cookie") ?? "";

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) not set. " +
        "Auth features are unavailable.",
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return parseCookieString(cookieHeader);
      },
      setAll(cookiesToSet) {
        const cookies = cookiesToSet.map(({ name, value, options }) => {
          const maxAge = options?.maxAge ?? 3600;
          return `${name}=${value}; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
        });
        if (cookies.length > 0) setResponseHeader("set-cookie", cookies);
      },
    },
  });

  return supabase;
}

function parseCookieString(cookie: string): { name: string; value: string }[] {
  if (!cookie) return [];
  return cookie
    .split(";")
    .filter((c) => c.trim())
    .map((c) => {
      const parts = c.trim().split("=");
      return { name: parts[0], value: parts.slice(1).join("=") };
    });
}
