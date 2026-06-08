import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Bot, Plus, Pencil, BarChart3, Code2, Trash2,
  Clock, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { listChatbots, deleteChatbot } from "@/lib/server-functions/chatbots";
import type { Chatbot } from "@/types/database";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "My AI Agents — BotbaseAI" },
      { name: "description", content: "Manage your AI support agents on BotbaseAI." },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { user, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Chatbot[]>([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalSources: 0,
    avgResponseTime: 0,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading && user) loadData();
    if (!authLoading && !user) setLoading(false);
    return () => { mountedRef.current = false; };
  }, [user, authLoading]);

  async function loadData() {
    try {
      const bots = await listChatbots();
      if (!mountedRef.current) return;
      setAgents(bots as unknown as Chatbot[]);

      let totalMsgs = 0;
      for (const bot of bots as unknown as Chatbot[]) {
        totalMsgs += bot.message_count ?? 0;
      }

      if (mountedRef.current) {
        setStats(prev => ({ ...prev, totalMessages: totalMsgs }));
      }
    } catch (err) {
      console.error("Failed to load agents:", err);
      if (mountedRef.current) setError("Failed to load your agents. Please try again.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function handleDelete(agentId: string) {
    if (!confirm("Delete this agent and all its data?")) return;
    try {
      await deleteChatbot({ data: { id: agentId } });
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
    } catch (err) {
      console.error("Failed to delete agent:", err);
      alert("Failed to delete agent. Please try again.");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading your agents...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Please sign in to view your agents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My AI Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build, train and deploy AI support agents for your business.
          </p>
        </div>
        <Link
          to="/dashboard/create"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Create new agent
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total messages", value: stats.totalMessages.toLocaleString() },
          { label: "Avg response time", value: stats.avgResponseTime > 0 ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : "—" },
          { label: "Active agents", value: agents.filter(a => a.status === "live").length.toString() },
          { label: "Total agents", value: agents.length.toString() },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-2xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">
          Your agents
          {agents.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({agents.length})</span>
          )}
        </h2>
        {agents.length === 0 && !error ? (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border p-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="text-lg font-semibold">No agents yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first AI support agent to get started.</p>
            </div>
            <Link to="/dashboard/create"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Create your first agent
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onDelete={handleDelete} />
            ))}
            <Link to="/dashboard/create"
              className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center transition-colors hover:border-primary/60 hover:bg-card">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <Plus className="h-6 w-6 text-primary" />
              </span>
              <span className="text-sm font-semibold">Create new agent</span>
              <span className="text-xs text-muted-foreground">Train a new AI agent on your data</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentCard({ agent, onDelete }: { agent: Chatbot; onDelete: (id: string) => void }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </span>
          <div>
            <h3 className="font-semibold leading-tight">{agent.name}</h3>
            <StatusBadge status={agent.status} />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> {(agent.message_count ?? 0).toLocaleString()} messages
        </p>
        <p className="flex items-center gap-2">
          <Clock className="h-4 w-4" /> {agent.updated_at ? timeAgo(new Date(agent.updated_at)) : "Never"}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 border-t border-border pt-4">
        <Link to={"/dashboard/agents/$id"} params={{ id: agent.id }}
          className="flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <Pencil className="h-4 w-4" /> Edit
        </Link>
        <Link to={"/dashboard/agents/$id/analytics"} params={{ id: agent.id }}
          className="flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <BarChart3 className="h-4 w-4" /> Analytics
        </Link>
        <Link to={"/dashboard/agents/$id/settings"} params={{ id: agent.id }}
          className="flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <Code2 className="h-4 w-4" /> Settings
        </Link>
        <button onClick={() => onDelete(agent.id)}
          className="flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Chatbot["status"] }) {
  if (status === "live") {
    return (
      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Live
      </span>
    );
  }
  return (
    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Draft
    </span>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
