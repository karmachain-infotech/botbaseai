import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { BarChart3, Bot, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { getAggregateAnalytics } from "@/lib/server-functions/analytics";

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    avgResponseTime: 0,
    totalAgents: 0,
    liveAgents: 0,
    resolvedRate: 0,
  });
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadStats();
    return () => { mountedRef.current = false; };
  }, []);

  async function loadStats() {
    try {
      const result = await getAggregateAnalytics();
      if (mountedRef.current) setStats(result);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      if (mountedRef.current) setError("Failed to load analytics data.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  if (loading) {
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
        <div className="mt-4 flex items-center justify-between rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={() => { setError(""); setLoading(true); loadStats(); }}
            className="ml-3 shrink-0 rounded-lg bg-destructive/20 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/30">
            Retry
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[
          { label: "Total conversations", value: stats.totalConversations.toLocaleString(), icon: MessageSquare, gradient: "from-blue-500/20 to-indigo-500/20" },
          { label: "Total messages", value: stats.totalMessages.toLocaleString(), icon: MessageSquare, gradient: "from-purple-500/20 to-pink-500/20" },
          { label: "Avg response time", value: stats.avgResponseTime ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : "—", icon: Clock, gradient: "from-amber-500/20 to-orange-500/20" },
          { label: "All agents", value: stats.totalAgents.toString(), icon: Bot, gradient: "from-primary/20 to-purple-500/20" },
          { label: "Live agents", value: stats.liveAgents.toString(), icon: TrendingUp, gradient: "from-emerald-500/20 to-teal-500/20" },
          { label: "Resolution rate", value: `${stats.resolvedRate}%`, icon: TrendingUp, gradient: "from-rose-500/20 to-red-500/20" },
        ].map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-card">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50`} />
            <div className="relative flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="relative mt-2 text-2xl font-extrabold">{s.value}</p>
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
