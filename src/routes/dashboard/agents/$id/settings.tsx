import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Bot, Shield, Palette, AlertTriangle, Code } from "lucide-react";
import { getChatbot, updateChatbot, deleteChatbot } from "@/lib/server-functions/chatbots";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { Chatbot } from "@/types/database";

export const Route = createFileRoute("/dashboard/agents/$id/settings")({
  component: AgentSettings,
});

const tabs = [
  { id: "general", label: "General", icon: Bot },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "embed", label: "Embed", icon: Code },
  { id: "security", label: "Security", icon: Shield },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
] as const;

type TabId = (typeof tabs)[number]["id"];

function AgentSettings() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Chatbot | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [language, setLanguage] = useState("en");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#1f2937");
  const [greeting, setGreeting] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [status, setStatus] = useState<"draft" | "live">("draft");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    async function load() {
      try {
        const bot = await getChatbot({ data: { id } });
        if (bot && mountedRef.current) {
          const data = bot as unknown as Chatbot;
          setAgent(data);
          setName(data.name);
          setInstructions(data.instructions ?? "");
          setModel(data.model);
          setLanguage(data.language);
          setPrimaryColor((data.widget_config as { primaryColor?: string })?.primaryColor ?? "#7c3aed");
          setBackgroundColor((data.widget_config as { backgroundColor?: string })?.backgroundColor ?? "#ffffff");
          setTextColor((data.widget_config as { textColor?: string })?.textColor ?? "#1f2937");
          setGreeting((data.widget_config as { greeting?: string })?.greeting ?? "");
          setAllowedDomains((data.allowed_domains ?? []).join("\n"));
          setStatus(data.status);
        }
      } catch (err) {
        console.error("Failed to load agent:", err);
        if (mountedRef.current) setError("Failed to load agent settings.");
      }
    }
    load();
    return () => { mountedRef.current = false; };
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      await updateChatbot({
        data: {
          id,
          name,
          instructions,
          model,
          language,
          status,
          widget_config: { ...(agent?.widget_config ?? {}), primaryColor, backgroundColor, textColor, greeting } as Record<string, unknown>,
          allowed_domains: allowedDomains.split("\n").map((d) => d.trim()).filter(Boolean),
        },
      });

      toast.success("Settings saved");
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this agent? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteChatbot({ data: { id } });
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("Failed to delete agent:", err);
      toast.error("Failed to delete agent");
      setDeleting(false);
    }
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-32" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-1 h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <Skeleton className="mt-6 h-10 w-full rounded-xl" />
        <Skeleton className="mt-6 h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agent settings</h1>
          <p className="text-sm text-muted-foreground">{agent.name}</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="mt-6 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-gradient-brand text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Agent name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Instructions / System prompt</label>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6}
                placeholder="You are a helpful customer support assistant..."
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Status</label>
              <div className="flex gap-3">
                <button onClick={() => setStatus("draft")}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    status === "draft" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}>Draft</button>
                <button onClick={() => setStatus("live")}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    status === "live" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}>Live</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className="space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Primary color (header, bubble)</label>
              <div className="flex flex-wrap items-center gap-3">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-10 rounded-lg border border-border cursor-pointer" />
                <span className="text-sm text-muted-foreground">{primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Background color (chat window)</label>
              <div className="flex flex-wrap items-center gap-3">
                <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-10 w-10 rounded-lg border border-border cursor-pointer" />
                <span className="text-sm text-muted-foreground">{backgroundColor}</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Text color</label>
              <div className="flex flex-wrap items-center gap-3">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                  className="h-10 w-10 rounded-lg border border-border cursor-pointer" />
                <span className="text-sm text-muted-foreground">{textColor}</span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Greeting message</label>
              <input value={greeting} onChange={(e) => setGreeting(e.target.value)}
                placeholder="Hi! How can I help you?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
          </div>
        )}

        {activeTab === "embed" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold">Website widget</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add this script to your website to embed the chat widget. Place it just before the closing <code className="rounded bg-secondary px-1 py-0.5 text-xs">&lt;/body&gt;</code> tag.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Widget script</p>
                <button onClick={() => { navigator.clipboard.writeText(`<script src="https://botbaseai.com/widget.js" data-bot-id="${id}"></script>`); }}
                  className="text-xs font-medium text-primary hover:underline">Copy</button>
              </div>
              <pre className="mt-2 overflow-x-auto text-xs font-mono">{`<script src="https://botbaseai.com/widget.js" data-bot-id="${id}"></script>`}</pre>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">Agent ID</p>
              <p className="mt-1 text-sm font-mono">{id}</p>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">
                Before the widget appears on your site, publish this agent by changing its status to <strong>Live</strong> in the General tab. The widget will use the primary color and greeting configured in the Appearance tab.
              </p>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Allowed domains <span className="text-muted-foreground">(one per line)</span></label>
              <textarea value={allowedDomains} onChange={(e) => setAllowedDomains(e.target.value)} rows={4}
                placeholder="example.com"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <p className="mt-1.5 text-xs text-muted-foreground">Only these domains will be allowed to embed your chat widget.</p>
            </div>
          </div>
        )}

        {activeTab === "danger" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <div>
                  <h3 className="font-semibold text-destructive">Delete this agent</h3>
                  <p className="text-sm text-muted-foreground">This will permanently delete the agent and all its training data.</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button disabled={deleting}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
                    <Trash2 className="h-4 w-4" /> {deleting ? "Deleting..." : "Delete agent"}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{agent.name}</strong> and all of its training data, conversation history, and settings. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
