export type Plan = "free" | "hobby" | "standard" | "pro" | "enterprise";

export type ChatbotStatus = "draft" | "live";

export type SourceType = "file" | "url" | "text" | "qa";

export type SourceStatus = "pending" | "processing" | "trained" | "failed";

export type ConversationStatus = "open" | "resolved" | "escalated";

export type MessageRole = "user" | "assistant" | "system";

export type AiactionMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  plan: Plan;
  message_credits_used: number;
  message_credits_limit: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface Chatbot {
  id: string;
  user_id: string;
  name: string;
  instructions: string;
  model: string;
  language: string;
  status: ChatbotStatus;
  widget_config: WidgetConfig;
  allowed_domains: string[];
  escalation_rules: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface WidgetConfig {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl: string | null;
  greeting: string;
  bubbleIcon: "message" | "robot" | "help";
  botName: string;
}

export interface Source {
  id: string;
  chatbot_id: string;
  type: SourceType;
  name: string;
  content: string;
  status: SourceStatus;
  file_size: number | null;
  created_at: string;
}

export interface Embedding {
  id: string;
  chatbot_id: string;
  source_id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string;
  chatbot_id: string;
  session_id: string;
  user_identifier: string | null;
  status: ConversationStatus;
  escalated: boolean;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  sources_used: { sourceId: string; chunkContent: string }[];
  tokens_used: number;
  response_time_ms: number;
  created_at: string;
}

export interface Aiaction {
  id: string;
  chatbot_id: string;
  name: string;
  description: string;
  method: AiactionMethod;
  url: string;
  headers: Record<string, string>;
  body_template: string | null;
  enabled: boolean;
  created_at: string;
}
