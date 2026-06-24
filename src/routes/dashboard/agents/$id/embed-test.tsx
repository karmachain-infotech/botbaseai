import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Copy, Check, Smartphone, Monitor, ExternalLink } from "lucide-react";
import { getChatbot } from "@/lib/server-functions/chatbots";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Skeleton } from "@/components/ui/skeleton";
import type { Chatbot } from "@/types/database";

export const Route = createFileRoute("/dashboard/agents/$id/embed-test")({
  component: EmbedTest,
});

function EmbedTest() {
  const { id } = Route.useParams();
  const [agent, setAgent] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const [baseUrl, setBaseUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    getChatbot({ data: { id } }).then((bot) => {
      if (bot && mountedRef.current) setAgent(bot as unknown as Chatbot);
    }).catch(console.error).finally(() => {
      if (mountedRef.current) setLoading(false);
    });
    return () => { mountedRef.current = false; };
  }, [id]);

  const botName = agent?.name ?? "AI Assistant";
  const primaryColor = (agent?.widget_config as Record<string, unknown>)?.primaryColor as string ?? "#6366f1";
  const greeting = (agent?.widget_config as Record<string, unknown>)?.greeting as string ?? "Hi! How can I help you today?";
  const resolvedBase = (baseUrl.trim() || "https://botbaseai.com").replace(/\/+$/, "");
  const autoCode = `<script src="${resolvedBase}/widget.js" data-bot-id="${id}" data-base-url="${resolvedBase}"></script>`;
  const embedCode = customCode || autoCode;
  const widgetUrl = `${resolvedBase}/api/widget/${id}/config`;

  function handleBaseUrlChange(val: string) {
    setBaseUrl(val);
    setCustomCode("");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { console.error("Failed to copy embed code"); }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-1 h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-[600px] rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Widget Preview & Test</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See exactly how your chatbot looks and behaves on your website.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("desktop")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              view === "desktop" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}>
            <Monitor className="h-4 w-4" /> Desktop
          </button>
          <button onClick={() => setView("mobile")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              view === "mobile" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}>
            <Smartphone className="h-4 w-4" /> Mobile
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-red-500" />
                <span className="flex h-3 w-3 rounded-full bg-yellow-500" />
                <span className="flex h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-2 rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground font-mono">yourwebsite.com</span>
              </div>
              <a href={`/api/widget/${id}/config`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3 w-3" /> Test API
              </a>
            </div>
            <div
              className={`relative overflow-x-auto ${view === "mobile" ? "mx-auto w-[375px] max-w-full" : "w-full"}`}
              style={{ minHeight: "520px", background: "#f8fafc" }}
            >
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="rounded-xl bg-white p-8 shadow-sm border border-border max-w-md">
                  <h2 className="text-xl font-bold text-gray-900">Welcome to Your Website</h2>
                  <p className="mt-3 text-gray-600 leading-relaxed">
                    This is a live preview of how your chatbot widget will appear on your website.
                    Click the chat bubble in the bottom-right corner to test your bot.
                  </p>
                  <div className="mt-6 grid gap-3 text-left">
                    {[
                      { label: "Product A", desc: "Learn about our flagship product" },
                      { label: "Product B", desc: "Explore our premium offering" },
                      { label: "Pricing", desc: "View our flexible pricing plans" },
                    ].map((item) => (
                      <div key={item.label}
                        className="rounded-lg border border-border bg-gray-50 p-3 text-sm cursor-pointer transition-colors hover:bg-gray-100">
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-gray-500">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-lg bg-gray-50 border border-border p-4 text-sm text-gray-600">
                    <p className="font-medium text-gray-900 mb-1">Need help?</p>
                    <p>Click the chat bubble below to ask your AI agent a question.</p>
                  </div>
                </div>
              </div>
              <ChatWidget botId={id} botName={botName} primaryColor={primaryColor} greeting={greeting} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">Widget Status</h3>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Agent</span>
                <span className="font-medium">{botName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium ${agent?.status === "live" ? "text-primary" : "text-muted-foreground"}`}>
                  {agent?.status === "live" ? "Live" : "Draft"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Color</span>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded" style={{ background: primaryColor }} />
                  <span className="font-mono text-xs">{primaryColor}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Greeting</span>
                <span className="text-right text-xs max-w-[180px] truncate">{greeting}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Embed Code</h3>
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground">Custom Domain (optional)</label>
              <input
                value={baseUrl}
                onChange={(e) => handleBaseUrlChange(e.target.value)}
                placeholder="https://your-domain.com"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Leave empty to use the default BotbaseAI domain.</p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Add this script before the closing <code className="rounded bg-secondary px-1 py-0.5">&lt;/body&gt;</code> tag.
            </p>
            <textarea
              value={embedCode}
              onChange={(e) => setCustomCode(e.target.value)}
              rows={3}
              className="mt-2 w-full resize-y rounded-lg border border-border bg-background p-3 text-xs font-mono leading-relaxed outline-none focus:border-primary"
            />
          </div>

          {agent?.status !== "live" && (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm">
              <p className="font-medium text-amber-800">Agent is in Draft mode</p>
              <p className="mt-1 text-amber-700">
                Set the agent status to <strong>Live</strong> in Settings for the widget to appear on your actual website.
              </p>
              <Link to="/dashboard/agents/$id/settings" params={{ id }}
                className="mt-3 inline-flex items-center gap-1 text-amber-800 font-medium hover:underline text-xs">
                Go to Settings <ArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">API Endpoints</h3>
            <div className="mt-3 space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Widget Config</p>
                <p className="mt-0.5 font-mono text-xs break-all">{widgetUrl}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Widget Chat</p>
                <p className="mt-0.5 font-mono text-xs break-all">POST /api/widget/{id}/chat</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
