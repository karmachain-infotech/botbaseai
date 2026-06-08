import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MessageSquare, CheckCircle, AlertTriangle, ArrowUpRight, Clock } from "lucide-react";
import { listConversations, getConversation } from "@/lib/server-functions/conversations";

export const Route = createFileRoute("/dashboard/agents/$id/activity")({
  component: AgentActivity,
});

function AgentActivity() {
  const { id } = Route.useParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadConversations();
    return () => { mountedRef.current = false; };
  }, [id]);

  async function loadConversations() {
    try {
      const data = await listConversations({ data: { chatbotId: id, limit: 50 } });
      if (mountedRef.current) setConversations(data ?? []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      if (mountedRef.current) setError("Failed to load conversations.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function openConversation(convId: string) {
    try {
      const conv = await getConversation({ data: { id: convId } });
      if (mountedRef.current) {
        setSelectedConv(conv as unknown as any);
        const msgs = (conv as unknown as { messages: any[] }).messages ?? [];
        setMessages(msgs);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  }

  const filtered = filter === "all"
    ? conversations
    : conversations.filter((c) => c.status === filter);

  function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">Conversation history for this agent.</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="mt-6 flex gap-2">
        {["all", "open", "resolved", "escalated"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === s ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No conversations found.</p>
          ) : (
            filtered.map((conv: any) => (
              <button key={conv.id} onClick={() => openConversation(conv.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors hover:border-primary/40 ${
                  selectedConv?.id === conv.id ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {conv.user_identifier ?? `Session: ${(conv.session_id ?? conv.id).slice(0, 12)}...`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusIcon status={conv.status} escalated={conv.escalated} />
                    {conv.rating && <span className="text-xs text-muted-foreground">{conv.rating}/5</span>}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {timeAgo(conv.created_at)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {selectedConv && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Messages</h3>
              <button onClick={() => setSelectedConv(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto">
              {messages.map((msg: any) => (
                <div key={msg.id} className={`rounded-lg p-3 text-sm ${msg.role === "user" ? "bg-secondary" : "bg-primary/5 border border-border"}`}>
                  <p className="text-xs font-medium text-muted-foreground capitalize mb-1">{msg.role}</p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status, escalated }: { status: string; escalated: boolean }) {
  if (escalated || status === "escalated") return <ArrowUpRight className="h-4 w-4 text-destructive" />;
  if (status === "resolved") return <CheckCircle className="h-4 w-4 text-primary" />;
  return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
}
