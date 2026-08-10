import React from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminGetUser,
  adminUpdateUser,
  adminDeleteUser,
} from "@/lib/server-functions/admin";
import type { AdminUserDetail, AdminChatbot } from "@/lib/types/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Shield,
  Trash2,
  Star,
  CreditCard,
  Bot,
  MessageSquare,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/admin/users/$id")({
  component: AdminUserDetail,
});

function AdminUserDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{
    user: AdminUserDetail;
    chatbots: (AdminChatbot & { model: string })[];
    stripeSubscription: Record<string, unknown> | null;
    messagesThisMonth: number;
    activityLog: {
      id: string;
      action: string;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }[];
  }>({
    queryKey: ["admin-user", id],
    queryFn: () =>
      adminGetUser({ data: { userId: id } }) as Promise<{
        user: AdminUserDetail;
        chatbots: (AdminChatbot & { model: string })[];
        stripeSubscription: Record<string, unknown> | null;
        messagesThisMonth: number;
        activityLog: {
          id: string;
          action: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        }[];
      }>,
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { plan?: string; is_admin?: boolean }) =>
      adminUpdateUser({ data: { userId: id, ...vars } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast.success("User updated");
    },
    onError: () => toast.error("Failed to update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminDeleteUser({ data: { userId: id } }),
    onSuccess: () => {
      toast.success("User deleted");
      router.navigate({ to: "/admin/users" });
    },
    onError: () => toast.error("Failed to delete user"),
  });

  const plans = ["free", "hobby", "standard", "pro", "enterprise"];

  if (isLoading) return <DetailSkeleton />;
  if (error) return <div className="p-6 text-red-400">Failed to load user</div>;
  if (!data) return null;

  const { user, chatbots, stripeSubscription, messagesThisMonth } = data;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/admin/users"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {user.name || "Unnamed User"}
          </h1>
          <p className="text-sm text-zinc-400">{user.email}</p>
        </div>
        <PlanBadge plan={user.plan} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Star className="h-4 w-4" /> Profile
            </h2>
            <div className="space-y-3">
              {[
                ["Name", user.name || "—"],
                ["Email", user.email],
                ["Joined", new Date(user.created_at).toLocaleDateString()],
                ["Admin", user.is_admin ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="text-sm text-white">{value}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-zinc-500">User ID</p>
                <p className="text-xs font-mono text-zinc-400">{user.id}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">Actions</h2>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-zinc-500">Change Plan</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {plans.map((plan) => (
                    <button
                      key={plan}
                      onClick={() => updateMutation.mutate({ plan })}
                      disabled={user.plan === plan}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${
                        user.plan === plan
                          ? "bg-red-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() =>
                  updateMutation.mutate({ is_admin: !user.is_admin })
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                <Shield className="h-4 w-4" />
                {user.is_admin ? "Remove admin" : "Make admin"}
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(`Delete user ${user.email}? This cannot be undone.`)
                  ) {
                    deleteMutation.mutate();
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-700 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={Bot} label="Chatbots" value={chatbots.length} />
            <StatCard
              icon={MessageSquare}
              label="Messages/Month"
              value={messagesThisMonth.toLocaleString()}
            />
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs">Credits</span>
              </div>
              <p className="mt-1 text-xl font-bold text-white">
                {user.message_credits_used}/{user.message_credits_limit}
              </p>
            </div>
          </div>

          {stripeSubscription && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <CreditCard className="h-4 w-4" /> Stripe Subscription
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status</span>
                  <span className="text-white capitalize">
                    {stripeSubscription.status as string}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Period End</span>
                  <span className="text-white">
                    {new Date(
                      stripeSubscription.currentPeriodEnd as string,
                    ).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Cancel at Period End</span>
                  <span className="text-white">
                    {stripeSubscription.cancelAtPeriodEnd ? "Yes" : "No"}
                  </span>
                </div>
                {(
                  (stripeSubscription.items as unknown as
                    | { amount: number; interval: string }[]
                    | undefined) ?? []
                ).map((item, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-zinc-500">Amount</span>
                    <span className="text-white">
                      ${item.amount}/{item.interval}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Bot className="h-4 w-4" /> Chatbots ({chatbots.length})
            </h2>
            <div className="space-y-2">
              {chatbots.length === 0 && (
                <p className="text-sm text-zinc-500">No chatbots created</p>
              )}
              {chatbots.map((bot) => (
                <Link
                  key={bot.id}
                  to="/admin/chatbots/$id"
                  params={{ id: bot.id }}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3 hover:bg-zinc-900"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{bot.name}</p>
                    <p className="text-xs text-zinc-500">
                      {bot.model} &middot; {bot.message_count} messages
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${bot.status === "live" ? "bg-green-900/50 text-green-400" : "bg-zinc-800 text-zinc-400"}`}
                  >
                    {bot.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Activity className="h-4 w-4" /> Activity Log
            </h2>
            <div className="space-y-2">
              {(!data.activityLog || data.activityLog.length === 0) && (
                <p className="text-sm text-zinc-500">No activity recorded</p>
              )}
              {(data.activityLog || []).slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between text-sm"
                >
                  <div>
                    <p className="text-zinc-300">
                      {log.action.replace(/_/g, " ")}
                    </p>
                    {log.metadata && (
                      <p className="text-xs text-zinc-500">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function PlanBadge({ plan }: { plan?: string }) {
  const colors: Record<string, string> = {
    free: "bg-zinc-800 text-zinc-400",
    hobby: "bg-blue-900/50 text-blue-400",
    standard: "bg-purple-900/50 text-purple-400",
    pro: "bg-amber-900/50 text-amber-400",
    enterprise: "bg-green-900/50 text-green-400",
  };
  return (
    <span
      className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${colors[plan || "free"] || colors.free}`}
    >
      {plan}
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 bg-zinc-800" />
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl bg-zinc-800" />
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl bg-zinc-800" />
          <Skeleton className="h-48 rounded-xl bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
