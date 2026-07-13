import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetAnalytics } from "@/lib/server-functions/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Activity, Bot, MessageSquare, Clock, Users } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

interface AnalyticsData {
  totalConversationsThisPeriod: number;
  avgResponseTime: number;
  topChatbots: { id: string; name: string; message_count: number }[];
  topUsers: { id: string; email: string; name: string; total_messages: number }[];
  dau: { date: string; count: number }[];
}

const PERIODS = ["7d", "30d", "90d"] as const;

function AdminAnalytics() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["admin-analytics", period],
    queryFn: () => adminGetAnalytics({ data: { period } }),
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
          <p className="mt-1 text-sm text-zinc-400">Usage and performance metrics.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 p-1">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${period === p ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >{p}</button>
          ))}
        </div>
      </div>

      {isLoading ? <AnalyticsSkeleton /> : error ? <div className="text-red-400">Failed to load analytics</div> : !data ? null : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MessageSquare, label: "Conversations", value: data.totalConversationsThisPeriod.toLocaleString() },
              { icon: Clock, label: "Avg Response", value: `${data.avgResponseTime}ms` },
              { icon: Bot, label: "Top Chatbots", value: data.topChatbots.length },
              { icon: Users, label: "Top Users", value: data.topUsers.length },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <s.icon className="h-4 w-4" />
                  <span className="text-xs">{s.label}</span>
                </div>
                <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="mb-4 text-sm font-medium text-zinc-300">Daily Active Users (DAU)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dau}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 12 }} tickFormatter={v => v?.slice(5) || ""} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#fff" }} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="mb-4 text-sm font-medium text-zinc-300">Top Chatbots by Message Count</h3>
              <div className="space-y-3">
                {data.topChatbots.length === 0 && <p className="text-sm text-zinc-500">No data</p>}
                {data.topChatbots.map((bot, i) => (
                  <div key={bot.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-xs text-zinc-500">#{i + 1}</span>
                      <span className="max-w-[200px] truncate text-sm text-white">{bot.name}</span>
                    </div>
                    <span className="text-sm text-zinc-400">{bot.message_count?.toLocaleString() || 0}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="mb-4 text-sm font-medium text-zinc-300">Top Users by Usage</h3>
              <div className="space-y-3">
                {data.topUsers.length === 0 && <p className="text-sm text-zinc-500">No data</p>}
                {data.topUsers.map((user, i) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-xs text-zinc-500">#{i + 1}</span>
                      <span className="max-w-[200px] truncate text-sm text-white">{user.name || user.email}</span>
                    </div>
                    <span className="text-sm text-zinc-400">{user.total_messages.toLocaleString()} msgs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="mb-4 text-sm font-medium text-zinc-300">Response Time Distribution (Last 7 Days)</h3>
            <p className="text-3xl font-bold text-white">{data.avgResponseTime}ms <span className="text-sm font-normal text-zinc-500">average</span></p>
          </div>
        </>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 bg-zinc-800" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />)}
      </div>
      <Skeleton className="mt-6 h-80 rounded-xl bg-zinc-800" />
    </div>
  );
}
