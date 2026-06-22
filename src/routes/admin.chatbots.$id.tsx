import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetChatbot, adminDeleteChatbot } from "@/lib/server-functions/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Bot, User, MessageSquare, FileText, Trash2 } from "lucide-react";
import React from "react";
import type { AdminChatbotDetail, AdminSource, AdminUser } from "@/lib/types/admin";

export const Route = createFileRoute("/admin/chatbots/$id")({
  component: AdminChatbotDetail,
});

function AdminChatbotDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{ chatbot: AdminChatbotDetail; owner: AdminUser; sources: AdminSource[]; totalConversations: number }>({
    queryKey: ["admin-chatbot", id],
    queryFn: () => adminGetChatbot({ data: { chatbotId: id } }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminDeleteChatbot({ data: { chatbotId: id } }),
    onSuccess: () => {
      toast.success("Chatbot deleted");
      router.navigate({ to: "/admin/chatbots" });
    },
    onError: () => toast.error("Failed to delete chatbot"),
  });

  if (isLoading) return <DetailSkeleton />;
  if (error) return <div className="p-6 text-red-400">Failed to load chatbot</div>;
  if (!data) return null;

  const { chatbot, owner, sources, totalConversations } = data;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/admin/chatbots" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{chatbot.name}</h1>
          <p className="text-sm text-zinc-400">{chatbot.model}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${chatbot.status === "live" ? "bg-green-900/50 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>
          {chatbot.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Bot className="h-4 w-4" /> Details
            </h2>
            <div className="space-y-3 text-sm">
              <div><p className="text-xs text-zinc-500">ID</p><p className="font-mono text-xs text-zinc-400">{chatbot.id}</p></div>
              <div><p className="text-xs text-zinc-500">Language</p><p className="text-white">{chatbot.language}</p></div>
              <div><p className="text-xs text-zinc-500">Created</p><p className="text-white">{new Date(chatbot.created_at).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-zinc-500">Updated</p><p className="text-white">{new Date(chatbot.updated_at).toLocaleDateString()}</p></div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <User className="h-4 w-4" /> Owner
            </h2>
            <Link to="/admin/users/$id" params={{ id: owner.id }} className="flex items-center gap-3 rounded-lg border border-zinc-800 p-3 hover:bg-zinc-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
                {owner.name?.slice(0, 2)?.toUpperCase() || "??"}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{owner.name}</p>
                <p className="text-xs text-zinc-500">{owner.email}</p>
              </div>
            </Link>
          </div>

          <button onClick={() => { if (confirm(`Delete chatbot "${chatbot.name}"?`)) deleteMutation.mutate(); }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-700 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20">
            <Trash2 className="h-4 w-4" /> Delete chatbot
          </button>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={MessageSquare} label="Messages" value={chatbot.message_count?.toLocaleString() || 0} />
            <StatCard icon={FileText} label="Sources" value={sources.length} />
            <StatCard icon={MessageSquare} label="Conversations" value={totalConversations.toLocaleString()} />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">Instructions</h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-400">{chatbot.instructions || "No instructions set"}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">Sources ({sources.length})</h2>
            <div className="space-y-2">
              {sources.length === 0 && <p className="text-sm text-zinc-500">No sources</p>}
              {sources.map(source => (
                <div key={source.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-zinc-500" />
                    <div>
                      <p className="text-sm text-white">{source.name}</p>
                      <p className="text-xs text-zinc-500">{source.type}</p>
                    </div>
                  </div>
                  <SourceStatusBadge status={source.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
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

function SourceStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    trained: "bg-green-900/50 text-green-400",
    processing: "bg-blue-900/50 text-blue-400",
    failed: "bg-red-900/50 text-red-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-zinc-800 text-zinc-400"}`}>
      {status}
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
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />)}
          </div>
          <Skeleton className="h-48 rounded-xl bg-zinc-800" />
          <Skeleton className="h-48 rounded-xl bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
