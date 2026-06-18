import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MessageSquare, Users, Clock, CheckCircle, TrendingUp, Star } from "lucide-react";
import { getAnalytics } from "@/lib/server-functions/analytics";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/agents/$id/analytics")({
  component: AgentAnalytics,
});

function AgentAnalytics() {
  const { id } = Route.useParams();
  const [stats, setStats] = useState<{
    totalConversations: number;
    totalMessages: number;
    avgResponseTime: number;
    csatScore: number;
    escalationRate: number;
    resolutionRate: number;
    topQuestions: { question: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadAnalytics();
    return () => { mountedRef.current = false; };
  }, [id]);

  async function loadAnalytics() {
    try {
      const result = await getAnalytics({ data: { chatbotId: id } });
      if (mountedRef.current) setStats(result);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      if (mountedRef.current) setError("Failed to load analytics data. Please try again.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-40" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-8 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const metrics = [
    { label: "Conversations", value: stats.totalConversations.toLocaleString(), icon: MessageSquare },
    { label: "Messages", value: stats.totalMessages.toLocaleString(), icon: TrendingUp },
    { label: "Avg response", value: `${(stats.avgResponseTime / 1000).toFixed(1)}s`, icon: Clock },
    { label: "Resolution rate", value: `${stats.resolutionRate}%`, icon: CheckCircle },
    { label: "Escalation rate", value: `${stats.escalationRate}%`, icon: Users },
    { label: "CSAT score", value: stats.csatScore > 0 ? `${stats.csatScore}/5` : "N/A", icon: Star },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Analytics</h1>

      {stats.totalConversations === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border p-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="text-lg font-semibold">No data yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Analytics will appear once your agent starts having conversations.</p>
          </div>
          <Link to={"/dashboard/agents/$id"} params={{ id }}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            Test your agent
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <m.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-3xl font-extrabold">{m.value}</p>
              </div>
            ))}
          </div>

          {stats.topQuestions.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">Top questions</h2>
              <div className="mt-4 rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-4 text-left font-medium text-muted-foreground">Question</th>
                      <th className="p-4 text-right font-medium text-muted-foreground">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topQuestions.map((q, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="p-4 text-foreground">{q.question}</td>
                        <td className="p-4 text-right text-muted-foreground">{q.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
