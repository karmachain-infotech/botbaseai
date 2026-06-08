import { createServerClient } from "@supabase/ssr";
import {
  getRequest,
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";

export function createClient() {
  const request = getRequest();

  if (!request) {
    throw new Error("createClient() must be called from a server context");
  }

  const headers = getRequestHeaders();

  const cookieHeader = headers.get("cookie") ?? "";

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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
          for (const { name, value, options } of cookiesToSet) {
            const maxAge = options?.maxAge ?? 3600;
            setResponseHeader(
              "set-cookie",
              `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
            );
          }
        },
      },
    },
  );

  return supabase;
}

function parseCookieString(cookie: string): { name: string; value: string }[] {
  if (!cookie) return [];
  return cookie.split(";").map((c) => {
    const parts = c.trim().split("=");
    return { name: parts[0], value: parts.slice(1).join("=") };
  });
}
