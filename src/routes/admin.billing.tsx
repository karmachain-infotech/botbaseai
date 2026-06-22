import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { AdminBillingStats } from "@/lib/types/admin";
import { adminGetBillingStats } from "@/lib/server-functions/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, CreditCard, Users, Download } from "lucide-react";

export const Route = createFileRoute("/admin/billing")({
  component: AdminBilling,
});

function AdminBilling() {
  const { data, isLoading, error } = useQuery<AdminBillingStats>({
    queryKey: ["admin-billing"],
    queryFn: () => adminGetBillingStats(),
    refetchInterval: 120_000,
  });

  function exportCSV(type: "subscriptions" | "transactions") {
    if (!data) return;
    const items = type === "subscriptions" ? data.subscriptions : data.transactions;
    const headers = type === "subscriptions"
      ? ["User", "Status", "Amount", "Next Billing", "ID"]
      : ["Date", "User", "Amount", "Status"];
    const rows = items.slice(0, 500).map(item =>
      headers.map(h => {
        const v = item[h.toLowerCase().replace(/\s/g, "_")] ?? item[h.toLowerCase()] ?? "";
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <BillingSkeleton />;
  if (error) return <div className="p-6 text-red-400">Failed to load billing data. Stripe may not be configured.</div>;
  if (!data) return null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Billing & Revenue</h1>
        <p className="mt-1 text-sm text-zinc-400">Platform revenue and subscription management.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { icon: DollarSign, label: "MRR", value: `$${data.mrr.toLocaleString()}` },
          { icon: TrendingUp, label: "ARR", value: `$${data.arr.toLocaleString()}` },
          { icon: CreditCard, label: "Total Revenue", value: `$${data.totalRevenue.toLocaleString()}` },
          { icon: Users, label: "ARPU", value: `$${data.arpu.toFixed(2)}` },
          { icon: Users, label: "Active Subs", value: data.totalSubscriptions.toLocaleString() },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center gap-2 text-zinc-400">
              <s.icon className="h-4 w-4" />
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Active Subscriptions</h2>
          <button onClick={() => exportCSV("subscriptions")}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
            <Download className="h-3 w-3" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                {["User", "Status", "Amount", "Next Billing", "Sub ID"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.subscriptions.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No active subscriptions</td></tr>
              )}
              {data.subscriptions.map(sub => (
                <tr key={sub.id} className="bg-zinc-950/50 hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-white">{sub.user_email}</td>
                  <td className="px-4 py-3"><SubStatusBadge status={sub.status} /></td>
                  <td className="px-4 py-3 text-zinc-300">${sub.items?.[0]?.amount || "?"}/{sub.items?.[0]?.interval || "mo"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{sub.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
          <button onClick={() => exportCSV("transactions")}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
            <Download className="h-3 w-3" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                {["Date", "User", "Amount", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.transactions.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No transactions</td></tr>
              )}
              {data.transactions.slice(0, 50).map(t => (
                <tr key={t.id} className="bg-zinc-950/50 hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-xs text-zinc-400">{t.date ? new Date(t.date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-white">{t.user_email}</td>
                  <td className="px-4 py-3 text-zinc-300">${t.amount.toFixed(2)}</td>
                  <td className="px-4 py-3"><TxStatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SubStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-900/50 text-green-400",
    past_due: "bg-red-900/50 text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-zinc-800 text-zinc-400"}`}>
      {status}
    </span>
  );
}

function TxStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status === "paid" ? "bg-green-900/50 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>
      {status}
    </span>
  );
}

function BillingSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-48 bg-zinc-800" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />)}
      </div>
      <Skeleton className="mt-8 h-64 rounded-xl bg-zinc-800" />
    </div>
  );
}
