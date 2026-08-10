import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { createServerClient } from "@supabase/ssr";
import { getAdminClient } from "./lib/supabase/admin";
import { streamChat } from "./lib/rag/chat";
import { checkRateLimit } from "./lib/rate-limit";
import { processStripeWebhook } from "./lib/server-functions/stripe";

type ServerEntry = {
  fetch: (
    request: Request,
    env: unknown,
    ctx: unknown,
  ) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (
    !body.includes('"unhandled":true') ||
    !body.includes('"message":"HTTPError"')
  ) {
    return response;
  }

  console.error(
    consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`),
  );
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function parseCookies(cookie: string): { name: string; value: string }[] {
  if (!cookie) return [];
  return cookie
    .split(";")
    .filter((c) => c.trim())
    .map((c) => {
      const parts = c.trim().split("=");
      return { name: parts[0], value: parts.slice(1).join("=") };
    });
}

async function getUserFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return parseCookies(cookie);
      },
      setAll() {},
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

async function handleWidgetConfig(botId: string): Promise<Response> {
  try {
    const admin = getAdminClient();
    const { data: chatbot, error } = await admin
      .from("chatbots")
      .select("name, status, widget_config")
      .eq("id", botId)
      .single();

    if (error) {
      console.error("[widgetConfig] Supabase error:", error.message);
      return jsonResponse({ error: "Failed to fetch chatbot config" }, 500);
    }

    if (!chatbot || chatbot.status !== "live") {
      return jsonResponse({ error: "Chatbot not found or not live" }, 404);
    }

    return jsonResponse(chatbot.widget_config);
  } catch (err) {
    console.error("[widgetConfig] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}

async function handleWidgetChat(
  botId: string,
  request: Request,
): Promise<Response> {
  let body: { message?: string; sessionId?: string; conversationId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const message = body.message?.trim();
  const sessionId = body.sessionId;

  if (!message || !sessionId) {
    return jsonResponse({ error: "Missing message or sessionId" }, 400);
  }

  if (message.length > 2000) {
    return jsonResponse({ error: "Message too long" }, 400);
  }

  const admin = getAdminClient();

  const { data: chatbot, error } = await admin
    .from("chatbots")
    .select("*")
    .eq("id", botId)
    .single();

  if (error) {
    console.error("[widgetChat] Supabase error:", error.message);
    return jsonResponse({ error: "Failed to verify chatbot" }, 500);
  }

  if (!chatbot || chatbot.status !== "live") {
    return jsonResponse({ error: "Chatbot not found or not live" }, 404);
  }

  const ipKey = `widget:${botId}:${sessionId}`;
  if (!checkRateLimit(ipKey)) {
    return jsonResponse({ error: "Rate limit exceeded" }, 429);
  }

  let conversationId = body.conversationId;
  if (!conversationId) {
    try {
      const { data: conv, error: convErr } = await admin
        .from("conversations")
        .insert({ chatbot_id: botId, session_id: sessionId })
        .select()
        .single();
      if (convErr)
        return jsonResponse({ error: "Failed to create conversation" }, 500);
      conversationId = conv!.id;
    } catch {
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "meta",
              conversationId,
            }) + "\n",
          ),
        );

        await streamChat(
          {
            chatbotId: botId,
            message,
            sessionId,
            conversationId,
            chatbot,
          },
          (chunk) => {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "chunk",
                  content: chunk,
                }) + "\n",
              ),
            );
          },
        );

        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "done" }) + "\n"),
        );
        controller.close();
      } catch (err) {
        console.error("[widgetChat] Error:", err);
        try {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                content: "Sorry, something went wrong. Please try again.",
              }) + "\n",
            ),
          );
          controller.close();
        } catch {
          /* ignore */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

async function handlePlaygroundChat(
  botId: string,
  request: Request,
): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const admin = getAdminClient();
  const { data: chatbot, error: chatError } = await admin
    .from("chatbots")
    .select("user_id")
    .eq("id", botId)
    .single();

  if (chatError || !chatbot) {
    return jsonResponse({ error: "Chatbot not found" }, 404);
  }

  if (chatbot.user_id !== user.id) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  let body: { message?: string; sessionId?: string; conversationId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const message = body.message?.trim();
  const sessionId = body.sessionId || `playground:${botId}:${Date.now()}`;

  if (!message) {
    return jsonResponse({ error: "Missing message" }, 400);
  }

  if (message.length > 2000) {
    return jsonResponse({ error: "Message too long" }, 400);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamChat(
          {
            chatbotId: botId,
            message,
            sessionId,
            conversationId: body.conversationId,
          },
          (chunk) => {
            controller.enqueue(encoder.encode(chunk));
          },
        );
        controller.close();
      } catch (err) {
        console.error("[playgroundChat] Error:", err);
        const userMessage =
          err instanceof Error && "userMessage" in err
            ? (err as { userMessage: string }).userMessage
            : "Sorry, something went wrong. Please try again.";
        try {
          controller.enqueue(encoder.encode(userMessage));
          controller.close();
        } catch {
          /* ignore */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

const widgetPathRe = /^\/api\/widget\/([^/]+)\/(config|chat)$/;
const playgroundPathRe = /^\/api\/playground\/([^/]+)\/chat$/;
const debugSearchRe = /^\/api\/debug\/search\/([^/]+)$/;
const stripeWebhookRe = /^\/api\/stripe\/webhook$/;

async function handleDebugSearch(
  botId: string,
  request: Request,
): Promise<Response> {
  try {
    const admin = getAdminClient();
    const url = new URL(request.url);
    const testQuery = url.searchParams.get("q") || "services";

    const { count: embedCount, error: countErr } = await admin
      .from("embeddings")
      .select("*", { count: "exact", head: true })
      .eq("chatbot_id", botId);

    const { data: sampleEmbeds, error: sampleErr } = await admin
      .from("embeddings")
      .select("id, content, chatbot_id")
      .eq("chatbot_id", botId)
      .limit(3);

    const { data: sources, error: srcErr } = await admin
      .from("sources")
      .select("id, name, type, status")
      .eq("chatbot_id", botId);

    let testSearchResult = null;
    try {
      const { searchSimilarChunks } = await import("./lib/rag/search");
      testSearchResult = await searchSimilarChunks(botId, testQuery, 0.3, 5);
    } catch (err) {
      testSearchResult = {
        error: err instanceof Error ? err.message : String(err),
      };
    }

    return jsonResponse({
      embedCount: countErr ? `Error: ${countErr.message}` : embedCount,
      sampleEmbeds: sampleErr ? `Error: ${sampleErr.message}` : sampleEmbeds,
      testQuery,
      testSearchResult,
      sources: srcErr ? `Error: ${srcErr.message}` : sources,
    });
  } catch (err) {
    console.error("[debugSearch] Error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}

async function handleStripeWebhook(request: Request): Promise<Response> {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return jsonResponse({ error: "Missing stripe-signature header" }, 400);
    }
    await processStripeWebhook(signature, body);
    return jsonResponse({ received: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook processing failed";
    console.error("[stripeWebhook] Error:", message);
    return jsonResponse({ error: message }, 400);
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      const widgetMatch = url.pathname.match(widgetPathRe);
      const playgroundMatch = url.pathname.match(playgroundPathRe);
      const debugSearchMatch = url.pathname.match(debugSearchRe);
      const stripeWebhookMatch = url.pathname.match(stripeWebhookRe);

      if (debugSearchMatch && request.method === "GET") {
        return await handleDebugSearch(debugSearchMatch[1], request);
      }

      if (playgroundMatch && request.method === "POST") {
        return await handlePlaygroundChat(playgroundMatch[1], request);
      }

      if (widgetMatch) {
        const botId = widgetMatch[1];
        const endpoint = widgetMatch[2];

        if (request.method === "OPTIONS") {
          return new Response(null, { headers: corsHeaders });
        }

        if (endpoint === "config" && request.method === "GET") {
          return await handleWidgetConfig(botId);
        }

        if (endpoint === "chat" && request.method === "POST") {
          return await handleWidgetChat(botId, request);
        }

        return jsonResponse({ error: "Method not allowed" }, 405);
      }

      if (stripeWebhookMatch && request.method === "POST") {
        return await handleStripeWebhook(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
