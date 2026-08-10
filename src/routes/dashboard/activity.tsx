import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Clock,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { ConversationStatus } from "@/types/database";

const PAGE_SIZE = 30;

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

type MessageRecord = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
  response_time_ms?: number | null;
};

export const Route = createFileRoute("/dashboard/activity")({
  head: () => ({
    meta: [
      { title: "Activity — BotbaseAI" },
      {
        name: "description",
        content: "View all conversations across your AI agents.",
      },
    ],
  }),
  component: DashboardActivity,
});

const statusFilters: (ConversationStatus | "all")[] = [
  "all",
  "open",
  "resolved",
  "escalated",
];

function DashboardActivity() {
  const { user, loading: authLoading } = useAuth();
  const supabaseRef = useRef(createClient());
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [filter, setFilter] = useState<ConversationStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ConversationRecord | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const botDataRef = useRef<{
    botMap: Map<string, string>;
    botIds: string[];
  } | null>(null);
  const mountedRef = useRef(true);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading && user) loadInitial();
    if (!authLoading && !user) setLoading(false);
    return () => {
      mountedRef.current = false;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (botDataRef.current) {
      setPage(1);
      loadPage(1);
    }
  }, [filter]);

  async function loadInitial() {
    const supabase = supabaseRef.current;
    try {
      if (!user) return;

      const { data: chatbots, error: botErr } = await supabase
        .from("chatbots")
        .select("id, name")
        .eq("user_id", user.id);

      if (botErr) {
        console.error("Chatbots query error:", botErr);
        if (mountedRef.current)
          setError("Failed to load chatbots: " + botErr.message);
        return;
      }

      if (!mountedRef.current) return;

      if (!chatbots || chatbots.length === 0) {
        if (mountedRef.current) {
          setConversations([]);
          setLoading(false);
        }
        return;
      }

      const botMap = new Map(chatbots.map((b) => [b.id, b.name]));
      const botIds = chatbots.map((b) => b.id);
      botDataRef.current = { botMap, botIds };

      setPage(1);
      await loadPage(1, botMap, botIds);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      if (mountedRef.current) setError("Failed to load activity data.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function loadPage(
    pageNum: number,
    botMap?: Map<string, string>,
    botIds?: string[],
  ) {
    const supabase = supabaseRef.current;
    const botData = botDataRef.current;
    const map = botMap ?? botData?.botMap;
    const ids = botIds ?? botData?.botIds;
    if (!map || !ids) return;

    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { count: total } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .in("chatbot_id", ids);

    const { data: convData, error: convErr } = await supabase
      .from("conversations")
      .select(
        "id, chatbot_id, session_id, user_identifier, status, escalated, rating, created_at, updated_at, messages(count)",
      )
      .in("chatbot_id", ids)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (!mountedRef.current) return;

    if (convErr) {
      console.error("Conversations query error:", convErr);
      if (mountedRef.current)
        setError("Failed to load conversations: " + convErr.message);
      return;
    }

    const raw: ConversationRecord[] = (convData ?? []).map((c) => ({
      ...c,
      chatbot_name: map.get(c.chatbot_id) ?? "Unknown",
      message_count:
        (c as { messages?: { count?: number }[] }).messages?.[0]?.count ?? 0,
    }));

    const grouped = new Map<string, ConversationRecord>();
    for (const r of raw) {
      const existing = grouped.get(r.session_id);
      if (existing) {
        existing.message_count += r.message_count;
        if (new Date(r.updated_at) > new Date(existing.updated_at)) {
          existing.status = r.status;
          existing.escalated = r.escalated;
          existing.rating = r.rating;
          existing.updated_at = r.updated_at;
        }
      } else {
        grouped.set(r.session_id, { ...r });
      }
    }

    if (mountedRef.current) {
      setConversations(Array.from(grouped.values()));
      setTotalCount(total ?? 0);
    }
  }

  function goToPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    setSelected(null);
    setMessages([]);
    setLoading(true);
    loadPage(newPage).finally(() => {
      if (mountedRef.current) setLoading(false);
    });
  }

  async function openConversation(conv: ConversationRecord) {
    const supabase = supabaseRef.current;
    setSelected(conv);
    setMessages([]);
    try {
      const { data: convIds } = await supabase
        .from("conversations")
        .select("id")
        .eq("session_id", conv.session_id);
      const ids = (convIds ?? []).map((c) => c.id);
      if (ids.length === 0) return;
      const { data } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true });
      if (mountedRef.current) setMessages(data ?? []);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }

  const filtered =
    filter === "all"
      ? conversations
      : conversations.filter((c) => c.status === filter);

  function timeAgo(dateStr: string): string {
    const seconds = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / 1000,
    );
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
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-secondary"
            />
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
          <p className="text-sm text-muted-foreground">
            Conversations across all your agents.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <button
            onClick={() => {
              setError("");
              setLoading(true);
              loadInitial();
            }}
            className="ml-3 shrink-0 rounded-lg bg-destructive/20 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/30"
          >
            Retry
          </button>
        </div>
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
        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border p-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="text-lg font-semibold">No conversations</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter !== "all"
                ? `No ${filter} conversations found. Try a different filter.`
                : "Conversations will appear here once your agents interact with users."}
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Bot className="h-4 w-4" /> View your agents
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-2">
            {filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full rounded-xl border p-4 text-left transition-colors hover:border-primary/40 ${
                  selected?.id === conv.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">
                        {conv.chatbot_name}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground truncate">
                      {conv.user_identifier ??
                        `Session: ${conv.session_id.slice(0, 12)}...`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusIcon
                      status={conv.status}
                      escalated={conv.escalated}
                    />
                    {conv.rating && (
                      <span className="text-xs text-muted-foreground">
                        {conv.rating}/5
                      </span>
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
            {totalPages > 1 && filter === "all" && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                  )
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center gap-1">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-muted-foreground">...</span>
                      )}
                      <button
                        onClick={() => goToPage(p)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          page === p
                            ? "bg-gradient-brand text-primary-foreground"
                            : "border border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {selected && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Conversation</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto">
                {messages.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Loading messages...
                  </p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-3 text-sm ${msg.role === "user" ? "bg-secondary" : "bg-primary/5 border border-border"}`}
                  >
                    <p className="text-xs font-medium text-muted-foreground capitalize mb-1">
                      {msg.role}
                    </p>
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

function StatusIcon({
  status,
  escalated,
}: {
  status: ConversationStatus;
  escalated: boolean;
}) {
  if (escalated || status === "escalated") {
    return <ArrowUpRight className="h-4 w-4 text-destructive" />;
  }
  if (status === "resolved") {
    return <CheckCircle className="h-4 w-4 text-primary" />;
  }
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
}
