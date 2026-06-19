// @ts-nocheck
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListAllChatbots, adminDeleteChatbot } from "@/lib/server-functions/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState } from "react";
import { Search, Eye, Trash2, Bot } from "lucide-react";

export const Route = createFileRoute("/admin/chatbots")({
  component: AdminChatbots,
});

function AdminChatbots() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isDetail = pathname !== "/admin/chatbots" && pathname.startsWith("/admin/chatbots");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-chatbots", search, statusFilter, page],
    queryFn: () => adminListAllChatbots({ data: { search, status: statusFilter, page } }),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (chatbotId: string) => adminDeleteChatbot({ data: { chatbotId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-chatbots"] });
      toast.success("Chatbot deleted");
    },
    onError: () => toast.error("Failed to delete chatbot"),
  });

  if (isDetail) return <Outlet />;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Chatbots</h1>
        <p className="mt-1 text-sm text-zinc-400">All chatbots across the platform.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text" placeholder="Search by name..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-64 rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 p-1">
          {["all", "draft", "live"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${statusFilter === s ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >{s}</button>
          ))}
        </div>
      </div>

      {isLoading ? <TableSkeleton /> : error ? <div className="text-red-400">Failed to load chatbots</div> : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                {["Name", "Owner", "Status", "Messages", "Created", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(!data?.chatbots || data.chatbots.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No chatbots found</td></tr>
              )}
              {data?.chatbots.map(bot => (
                <tr key={bot.id} className="bg-zinc-950/50 hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Bot className="h-4 w-4 text-zinc-500" />
                      <span className="font-medium text-white">{bot.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-zinc-300">{bot.owner_name || "Unknown"}</p>
                    <p className="text-xs text-zinc-500">{bot.owner_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <BotStatusBadge status={bot.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{bot.message_count?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{new Date(bot.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to="/admin/chatbots/$id" params={{ id: bot.id }}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button onClick={() => { if (confirm(`Delete chatbot "${bot.name}"?`)) deleteMutation.mutate(bot.id); }}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
              <p className="text-sm text-zinc-500">{data.total} total</p>
              <Pagination page={page} totalPages={data.totalPages} onPage={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BotStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      status === "live" ? "bg-green-900/50 text-green-400" : "bg-zinc-800 text-zinc-400"
    }`}>{status}</span>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages: (number | string)[] = [];
  const delta = 1;
  const left = Math.max(2, page - delta);
  const right = Math.min(totalPages - 1, page + delta);
  pages.push(1);
  if (left > 2) pages.push("...");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);

  return (
    <div className="flex items-center gap-1">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}
        className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none">Prev</button>
      {pages.map((p, i) =>
        p === "..." ? <span key={`e${i}`} className="px-1 text-xs text-zinc-600">...</span>
        : <button key={p} onClick={() => onPage(p as number)}
            className={`min-w-[32px] rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${p === page ? "bg-red-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}>{p}</button>
      )}
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)}
        className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none">Next</button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-xl bg-zinc-800" />
      {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="h-14 w-full rounded-xl bg-zinc-800" />))}
    </div>
  );
}
