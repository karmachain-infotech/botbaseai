// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "@/lib/server-functions/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Bot, MessageSquare, CreditCard, DollarSign, TrendingUp, TrendingDown, UserMinus } from "lucide-react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"];

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => getAdminDashboard(),
    refetchInterval: 60_000,
  });

  if (error) return <ErrorState message="Failed to load dashboard" />;
  if (isLoading || !data) return <DashboardSkeleton />;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-sm text-zinc-400">Real-time platform statistics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Users" value={data.totalUsers.toLocaleString()} change={`${data.userGrowthPercent >= 0 ? "+" : ""}${data.userGrowthPercent}%`} trend={data.userGrowthPercent >= 0 ? "up" : "down"} icon={Users} />
        <StatCard title="Chatbots" value={data.totalChatbots.toLocaleString()} icon={Bot} />
        <StatCard title="Messages" value={data.totalMessages.toLocaleString()} icon={MessageSquare} />
        <StatCard title="Monthly Revenue" value={`$${data.monthlyRevenue.toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Active Subs" value={data.activeSubscriptions.toLocaleString()} icon={CreditCard} />
        <StatCard title="Churned" value={data.churnedUsersThisMonth.toString()} icon={UserMinus} negative />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="User Signups (Last 30 Days)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.userSignupsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 12 }} tickFormatter={v => v?.slice(5) ?? ""} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#fff" }} />
              <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Messages Per Day (Last 30 Days)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.messagesPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 12 }} tickFormatter={v => v?.slice(5) ?? ""} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revenue Over Time">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#fff" }} />
              <Area type="monotone" dataKey="amount" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Plan Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.planDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" label={({ plan, percent }) => `${plan} (${(percent * 100).toFixed(0)}%)`}>
                {data.planDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#fff" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <ActivityFeed title="Recent Signups" items={data.recentSignups.map(s => ({ label: s.name || s.email, sub: s.email, time: s.created_at }))} />
        <ActivityFeed title="New Chatbots" items={data.recentChatbots.map(c => ({ label: c.name, sub: c.user_email, time: c.created_at }))} />
        <ActivityFeed title="Subscription Changes" items={data.recentSubscriptionChanges.map(sc => ({ label: sc.action.replace(/_/g, " "), sub: sc.user_email, time: sc.created_at }))} />
      </div>
    </div>
  );
}

function StatCard({ title, value, change, trend, icon: Icon, negative }: any) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-zinc-400">{title}</p>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {change && (
        <div className={`mt-1 flex items-center gap-1 text-xs ${negative ? "text-red-400" : trend === "up" ? "text-green-400" : "text-red-400"}`}>
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change}
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      <h3 className="mb-4 text-sm font-medium text-zinc-300">{title}</h3>
      {children}
    </div>
  );
}

function ActivityFeed({ title, items }: { title: string; items: { label: string; sub: string; time: string }[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      <h3 className="mb-4 text-sm font-medium text-zinc-300">{title}</h3>
      <div className="space-y-3 max-h-[320px] overflow-y-auto">
        {items.length === 0 && <p className="text-sm text-zinc-500">No recent activity</p>}
        {items.slice(0, 10).map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{item.label}</p>
              <p className="truncate text-xs text-zinc-500">{item.sub}</p>
            </div>
            <span className="shrink-0 text-xs text-zinc-500">{timeAgo(item.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-96 items-center justify-center p-6">
      <div className="text-center">
        <p className="text-red-400">{message}</p>
        <button onClick={() => window.location.reload()} className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Retry</button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 bg-zinc-800" />
      <Skeleton className="mt-2 h-4 w-72 bg-zinc-800" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />)}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl bg-zinc-800" />)}
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}
