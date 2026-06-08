import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { BarChart3, ArrowLeft, Bot, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — BotbaseAI" },
      { name: "description", content: "Aggregate analytics across all your AI agents." },
    ],
  }),
  component: DashboardAnalytics,
});

function DashboardAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    avgResponseTime: "--",
    totalAgents: 0,
    liveAgents: 0,
    resolvedRate: 0,
  });
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!authLoading && user) loadStats();
    if (!authLoading && !user) setLoading(false);
    return () => { mountedRef.current = false; };
  }, [user, authLoading]);

  async function loadStats() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: chatbots } = await supabase
        .from("chatbots")
        .select("id, status, message_count")
        .eq("user_id", authUser.id);

      if (!mountedRef.current || !chatbots) return;

      const botIds = chatbots.map(b => b.id);
      const totalAgents = chatbots.length;
      const liveAgents = chatbots.filter(b => b.status === "live").length;
      const totalMessages = chatbots.reduce((sum, b) => sum + (b.message_count ?? 0), 0);

      let totalConversations = 0;
      let resolvedCount = 0;

      if (botIds.length > 0) {
        const { data: conversations } = await supabase
          .from("conversations")
          .select("id, status")
          .in("chatbot_id", botIds);

        if (conversations) {
          totalConversations = conversations.length;
          resolvedCount = conversations.filter(c => c.status === "resolved").length;
        }
      }

      if (mountedRef.current) {
        setStats({
          totalConversations,
          totalMessages,
          avgResponseTime: "--",
          totalAgents,
          liveAgents,
          resolvedRate: totalConversations > 0 ? Math.round((resolvedCount / totalConversations) * 100) : 0,
        });
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
      if (mountedRef.current) setError("Failed to load analytics data.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Aggregate performance across all agents.</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[
          { label: "Total conversations", value: stats.totalConversations.toLocaleString(), icon: MessageSquare },
          { label: "Total messages", value: stats.totalMessages.toLocaleString(), icon: MessageSquare },
          { label: "Avg response time", value: stats.avgResponseTime > 0 ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : "—", icon: Clock },
          { label: "All agents", value: stats.totalAgents.toString(), icon: Bot },
          { label: "Live agents", value: stats.liveAgents.toString(), icon: TrendingUp },
          { label: "Resolution rate", value: `${stats.resolvedRate}%`, icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>

      {stats.totalConversations === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-lg font-semibold">No data yet</p>
          <p className="text-sm text-muted-foreground">Analytics will appear once your agents receive messages.</p>
          <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">← Back to agents</Link>
        </div>
      )}
    </div>
  );
}
