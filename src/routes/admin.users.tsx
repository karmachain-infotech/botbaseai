// @ts-nocheck
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListUsers, adminUpdateUser, adminDeleteUser } from "@/lib/server-functions/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Search, Trash2, Shield, ShieldOff, Download } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type SortKey = "email" | "plan" | "created_at" | "is_admin";

function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isDetail = pathname !== "/admin/users" && pathname.startsWith("/admin/users");

  if (isDetail) return <Outlet />;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", search, planFilter, sort, page],
    queryFn: () => adminListUsers({
      data: {
        search: search || undefined,
        plan: planFilter !== "all" ? planFilter : undefined,
        sortBy: sort.key,
        sortOrder: sort.dir,
        page,
        pageSize: PAGE_SIZE,
      },
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => adminDeleteUser({ data: { userId: id } }))),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setSelected(new Set()); },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => adminUpdateUser({ data: { userId, is_admin: makeAdmin } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const toggleSort = (key: SortKey) => {
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
    setPage(1);
  };

  const selectAll = (users: any[]) => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map(u => u.id)));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const exportCSV = () => {
    if (!data?.users) return;
    const headers = ["ID", "Email", "Name", "Plan", "Admin", "Created"];
    const rows = data.users.map(u => [u.id, u.email, u.name || "", u.plan || "", u.is_admin ? "Yes" : "No", u.created_at]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <ErrorState message="Failed to load users" />;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="mt-1 text-sm text-zinc-400">{data?.total ?? 0} total users</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <>
              <Button variant="destructive" size="sm" onClick={() => { if (confirm(`Delete ${selected.size} user(s)?`)) deleteMutation.mutate(Array.from(selected)); }}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete ({selected.size})
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="border-zinc-800 bg-zinc-950 pl-10 text-white placeholder:text-zinc-500" />
        </div>
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white">
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {isLoading ? <UsersTableSkeleton />
      : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950">
                  <th className="p-4 text-left">
                    <input type="checkbox" checked={data?.users?.length > 0 && selected.size === data.users.length} onChange={() => selectAll(data?.users ?? [])} className="rounded border-zinc-600 bg-zinc-800" />
                  </th>
                  <SortHeader label="Email" sortKey="email" current={sort} onClick={toggleSort} />
                  <th className="p-4 text-left text-zinc-400 font-medium">Name</th>
                  <SortHeader label="Plan" sortKey="plan" current={sort} onClick={toggleSort} />
                  <SortHeader label="Admin" sortKey="is_admin" current={sort} onClick={toggleSort} />
                  <SortHeader label="Created" sortKey="created_at" current={sort} onClick={toggleSort} />
                  <th className="p-4 text-left text-zinc-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.users?.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-zinc-500">No users found</td></tr>
                )}
                {data?.users?.map((u: any) => (
                  <tr key={u.id} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                    <td className="p-4"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded border-zinc-600 bg-zinc-800" /></td>
                    <td className="p-4"><Link to="/admin/users/$id" params={{ id: u.id }} className="text-blue-400 hover:underline">{u.email}</Link></td>
                    <td className="p-4 text-zinc-300">{u.name || "\u2014"}</td>
                    <td className="p-4"><PlanBadge plan={u.plan} /></td>
                    <td className="p-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.is_admin ? "bg-purple-900/50 text-purple-300" : "bg-zinc-800 text-zinc-500"}`}>
                        {u.is_admin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <button onClick={() => toggleAdminMutation.mutate({ userId: u.id, makeAdmin: !u.is_admin })} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white" title={u.is_admin ? "Remove admin" : "Make admin"}>
                          {u.is_admin ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                        </button>
                        <button onClick={() => { if (confirm("Delete this user?")) deleteMutation.mutate([u.id]); }} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-red-400" title="Delete user">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-zinc-500">{data.total} total</p>
              <Pagination page={page} totalPages={data.totalPages} onPage={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SortHeader({ label, sortKey, current, onClick }: { label: string; sortKey: SortKey; current: { key: SortKey; dir: string }; onClick: (k: SortKey) => void }) {
  const active = current.key === sortKey;
  return (
    <th className="p-4 text-left cursor-pointer select-none" onClick={() => onClick(sortKey)}>
      <div className="flex items-center gap-1 text-zinc-400 font-medium">
        {label}
        {active && (current.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </div>
    </th>
  );
}

function PlanBadge({ plan }: { plan?: string }) {
  const colors: Record<string, string> = { free: "bg-zinc-800 text-zinc-400", starter: "bg-blue-900/50 text-blue-300", pro: "bg-purple-900/50 text-purple-300", enterprise: "bg-amber-900/50 text-amber-300" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[plan || "free"] ?? colors.free}`}>{plan || "free"}</span>;
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages: (number | "...")[] = [];
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
        className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none">
        Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="px-1 text-xs text-zinc-600">...</span>
        ) : (
          <button key={p} onClick={() => onPage(p)}
            className={`min-w-[32px] rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              p === page ? "bg-red-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}>
            {p}
          </button>
        )
      )}
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)}
        className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none">
        Next
      </button>
    </div>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl bg-zinc-800" />)}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-96 items-center justify-center text-red-400">
      <p>{message}</p>
    </div>
  );
}
