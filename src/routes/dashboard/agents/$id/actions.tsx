import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Trash2, Zap, ToggleLeft, ToggleRight } from "lucide-react";
import { listActions, createAction, updateAction, deleteAction } from "@/lib/server-functions/actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { Aiaction, AiactionMethod } from "@/types/database";

export const Route = createFileRoute("/dashboard/agents/$id/actions")({
  component: AgentActions,
});

function AgentActions() {
  const { id } = Route.useParams();
  const [actions, setActions] = useState<Aiaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", method: "GET" as AiactionMethod, url: "", headers: "{}", body_template: "",
  });
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadActions();
    return () => { mountedRef.current = false; };
  }, [id]);

  async function loadActions() {
    try {
      const data = await listActions({ data: { chatbotId: id } });
      if (mountedRef.current) setActions(data as unknown as Aiaction[]);
    } catch (err) {
      console.error("Failed to load actions:", err);
      if (mountedRef.current) setError("Failed to load AI actions.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    setError("");

    try {
      let headers: Record<string, string> = {};
      try {
        headers = JSON.parse(form.headers);
      } catch {
        throw new Error("Headers must be valid JSON");
      }

      const action = await createAction({
        data: {
          chatbotId: id,
          name: form.name,
          description: form.description || undefined,
          method: form.method,
          url: form.url,
          headers,
          body_template: form.body_template || undefined,
        },
      });

      setActions((prev) => [action as unknown as Aiaction, ...prev]);
      setShowForm(false);
      setForm({ name: "", description: "", method: "GET", url: "", headers: "{}", body_template: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create action");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(actionId: string, enabled: boolean) {
    try {
      await updateAction({ data: { id: actionId, enabled } });
      setActions((prev) => prev.map((a) => a.id === actionId ? { ...a, enabled } : a));
    } catch (err) {
      console.error("Failed to toggle action:", err);
    }
  }

  async function handleDelete(actionId: string) {
    if (!confirm("Delete this action?")) return;
    try {
      await deleteAction({ data: { id: actionId } });
      setActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch (err) {
      console.error("Failed to delete action:", err);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Actions</h1>
          <p className="text-sm text-muted-foreground">Let your agent perform actions via API calls.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> {showForm ? "Cancel" : "New action"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {showForm && (
        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Get order status"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Method</label>
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as AiactionMethod })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description of what this action does"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">URL</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://api.example.com/orders/{order_id}"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Headers (JSON)</label>
              <textarea value={form.headers} onChange={(e) => setForm({ ...form, headers: e.target.value })} rows={3}
                placeholder='{"Authorization": "Bearer ..."}'
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Body template (POST/PUT)</label>
              <textarea value={form.body_template} onChange={(e) => setForm({ ...form, body_template: e.target.value })} rows={3}
                placeholder='{"order_id": "{order_id}"}'
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving || !form.name || !form.url}
            className="rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? "Creating..." : "Create action"}
          </button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
            <Zap className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-semibold">No actions yet</p>
            <p className="text-sm text-muted-foreground">Create AI actions to let your agent interact with external APIs.</p>
          </div>
        ) : (
          actions.map((action) => (
            <div key={action.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{action.name}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{action.method}</span>
                </div>
                {action.description && <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground font-mono truncate">{action.url}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button onClick={() => handleToggle(action.id, !action.enabled)}
                  className="text-muted-foreground hover:text-foreground">
                  {action.enabled ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => handleDelete(action.id)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
