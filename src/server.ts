import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { getAdminClient } from "./lib/supabase/admin";
import { streamChat } from "./lib/rag/chat";
import { checkRateLimit } from "./lib/rate-limit";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
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
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
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

async function handleWidgetChat(botId: string, request: Request): Promise<Response> {
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

  try {
    const admin = getAdminClient();

    const { data: chatbot, error } = await admin
      .from("chatbots")
      .select("id, status")
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
    const result = await streamChat({
      chatbotId: botId,
      message,
      sessionId,
      conversationId: body.conversationId,
    });

    return jsonResponse({
      conversationId: result.conversationId,
      content: result.content,
    });
  } catch (err) {
    console.error("Widget chat error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}

async function handlePlaygroundChat(botId: string, request: Request): Promise<Response> {
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
        await streamChat({
          chatbotId: botId,
          message,
          sessionId,
          conversationId: body.conversationId,
        }, (chunk) => {
          controller.enqueue(encoder.encode(chunk));
        });
        controller.close();
      } catch (err) {
        console.error("[playgroundChat] Error:", err);
        try {
          controller.enqueue(encoder.encode("Sorry, something went wrong. Please try again."));
          controller.close();
        } catch { /* ignore */ }
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

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      const widgetMatch = url.pathname.match(widgetPathRe);
      const playgroundMatch = url.pathname.match(playgroundPathRe);

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
