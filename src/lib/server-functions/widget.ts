import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminClient } from "../supabase/admin";
import { streamChat } from "../rag/chat";
import { checkRateLimit } from "../rate-limit";
import {
  DatabaseError,
  NotFoundError,
  RateLimitError,
  handleServerError,
} from "../errors";

export const getWidgetConfig = createServerFn({ method: "GET" })
  .inputValidator(z.object({ botId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const admin = getAdminClient();

      const { data: chatbot, error } = await admin
        .from("chatbots")
        .select("name, status, widget_config")
        .eq("id", data.botId)
        .single();

      if (error) throw new DatabaseError(error.message);
      if (!chatbot || chatbot.status !== "live") {
        throw new NotFoundError("Chatbot");
      }

      return chatbot.widget_config;
    } catch (error) {
      throw handleServerError(error, "getWidgetConfig");
    }
  });

export const widgetChat = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      botId: z.string().uuid(),
      message: z.string().min(1).max(2000),
      sessionId: z.string(),
      conversationId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const admin = getAdminClient();

      const { data: chatbot, error } = await admin
        .from("chatbots")
        .select("id, status")
        .eq("id", data.botId)
        .single();

      if (error) throw new DatabaseError(error.message);
      if (!chatbot || chatbot.status !== "live") {
        throw new NotFoundError("Chatbot");
      }

      const ipKey = `widget:${data.botId}:${data.sessionId}`;
      if (!checkRateLimit(ipKey)) {
        throw new RateLimitError();
      }

      const result = await streamChat({
        chatbotId: data.botId,
        message: data.message,
        sessionId: data.sessionId,
        conversationId: data.conversationId,
      });

      return result;
    } catch (error) {
      throw handleServerError(error, "widgetChat");
    }
  });
