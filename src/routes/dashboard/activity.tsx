import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { MessageSquare, ArrowLeft, CheckCircle, AlertCircle, ArrowUpRight, Clock, Bot } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { ConversationStatus } from "@/types/database";

interface ConversationRecord {
  id: string;
  chatbot_id: string;
  chatbot_name: string;
  session_id: string;
  user_identifier: string | null;
  status: ConversationStatus;
  escalated: boolean;
  rating: number | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export const Route = createFileRoute("/dashboard/activity")({
  head: () => ({
    meta: [
      { title: "Activity — BotbaseAI" },
      { name: "description", content: "View all conversations across your AI agents." },
    ],
  }),
  component: DashboardActivity,
});

const statusFilters: (ConversationStatus | "all")[] = ["all", "open", "resolved", "escalated"];

function DashboardActivity() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [filter, setFilter] = useState<ConversationStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ConversationRecord | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading && user) loadConversations();
    if (!authLoading && !user) setLoading(false);
    return () => { mountedRef.current = false; };
  }, [user, authLoading]);

  async function loadConversations() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: chatbots } = await supabase
        .from("chatbots")
        .select("id, name")
        .eq("user_id", authUser.id);

      if (!mountedRef.current || !chatbots || chatbots.length === 0) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      const botMap = new Map(chatbots.map(b => [b.id, b.name]));
      const botIds = chatbots.map(b => b.id);

      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, chatbot_id, session_id, user_identifier, status, escalated, rating, created_at, updated_at")
        .in("chatbot_id", botIds)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (!mountedRef.current) return;

      const records: ConversationRecord[] = (conversations ?? []).map(c => ({
        ...c,
        chatbot_name: botMap.get(c.chatbot_id) ?? "Unknown",
        message_count: 0,
      }));

      for (const record of records) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", record.id);
        record.message_count = count ?? 0;
      }

      if (mountedRef.current) setConversations(records);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      if (mountedRef.current) setError("Failed to load activity data.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function openConversation(conv: ConversationRecord) {
    setSelected(conv);
    setMessages([]);
    try {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      if (mountedRef.current) setMessages(data ?? []);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }

  const filtered = filter === "all"
    ? conversations
    : conversations.filter(c => c.status === filter);

  function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-36 animate-pulse rounded bg-secondary" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">Conversations across all your agents.</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="mt-6 flex gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === s
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-lg font-semibold">No conversations</p>
          <p className="text-sm text-muted-foreground">Conversations will appear here once your agents interact with users.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-2">
            {filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full rounded-xl border p-4 text-left transition-colors hover:border-primary/40 ${
                  selected?.id === conv.id ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">{conv.chatbot_name}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground truncate">
                      {conv.user_identifier ?? `Session: ${conv.session_id.slice(0, 12)}...`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusIcon status={conv.status} escalated={conv.escalated} />
                    {conv.rating && (
                      <span className="text-xs text-muted-foreground">{conv.rating}/5</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {conv.message_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {timeAgo(conv.updated_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Conversation</h3>
                <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
              </div>
              <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto">
                {messages.length === 0 && (
                  <p className="text-xs text-muted-foreground">Loading messages...</p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`rounded-lg p-3 text-sm ${msg.role === "user" ? "bg-secondary" : "bg-primary/5 border border-border"}`}>
                    <p className="text-xs font-medium text-muted-foreground capitalize mb-1">{msg.role}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status, escalated }: { status: ConversationStatus; escalated: boolean }) {
  if (escalated || status === "escalated") {
    return <ArrowUpRight className="h-4 w-4 text-destructive" />;
  }
  if (status === "resolved") {
    return <CheckCircle className="h-4 w-4 text-primary" />;
  }
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
}
