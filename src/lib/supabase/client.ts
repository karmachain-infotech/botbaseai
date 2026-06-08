import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let fallbackClient: SupabaseClient | null = null;

function getRealtimeOptions(): { realtime: { transport: typeof globalThis.WebSocket } } | undefined {
  if (typeof globalThis.WebSocket !== "undefined") {
    return { realtime: { transport: globalThis.WebSocket } };
  }
  return undefined;
}

function createFallbackClient(): SupabaseClient {
  if (fallbackClient) return fallbackClient;
  console.warn(
    "Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) not set. " +
      "Auth features will be unavailable until you configure them.",
  );
  fallbackClient = createBrowserClient("https://placeholder.supabase.co", "placeholder-key", getRealtimeOptions());
  return fallbackClient;
}

export function isSupabaseConfigured(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function createClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    return createFallbackClient();
  }

  const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createBrowserClient(url!, key!, getRealtimeOptions());
}
