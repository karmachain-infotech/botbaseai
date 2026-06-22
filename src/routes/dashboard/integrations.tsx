import { createFileRoute, Link } from "@tanstack/react-router";
import { Plug, Globe, Slack, MessageCircle, Mail, ExternalLink, Check, Copy, ArrowRight, ChevronRight, Loader2, Key, Bell, Paintbrush, Shield, Eye, Code, Globe as Domain } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { listChatbots } from "@/lib/server-functions/chatbots";
import type { Chatbot } from "@/types/database";

export const Route = createFileRoute("/dashboard/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — BotbaseAI" },
      { name: "description", content: "Connect your AI agents to your favorite tools." },
    ],
  }),
  component: DashboardIntegrations,
});

type IntegrationStatus = "built-in" | "coming soon";

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  longDesc: string;
  icon: typeof Globe;
  status: IntegrationStatus;
  color: string;
  docsUrl?: string;
}

const integrations: IntegrationItem[] = [
  {
    id: "website-widget",
    name: "Website Widget",
    description: "Embed your agent on any website with a snippet.",
    longDesc: "Add your AI agent to any website by pasting a single script tag. Customize the appearance, greeting, and behavior from your agent settings.",
    icon: Globe,
    status: "built-in",
    color: "bg-primary/10 text-primary",
    docsUrl: "#",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect your agent to Slack channels.",
    longDesc: "Let your agent join Slack channels and respond to mentions and messages in real-time. Your team can collaborate with the agent directly in Slack.",
    icon: Slack,
    status: "coming soon",
    color: "bg-secondary text-muted-foreground",
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Sync conversations with Zendesk tickets.",
    longDesc: "Automatically create and update Zendesk tickets from conversations. Your support team gets full context without switching tools.",
    icon: MessageCircle,
    status: "coming soon",
    color: "bg-secondary text-muted-foreground",
  },
  {
    id: "intercom",
    name: "Intercom",
    description: "Connect your agent with Intercom messenger.",
    longDesc: "Replace or augment your Intercom bot with BotbaseAI. Seamlessly hand off to human agents when needed.",
    icon: MessageCircle,
    status: "coming soon",
    color: "bg-secondary text-muted-foreground",
  },
  {
    id: "email",
    name: "Email",
    description: "Reply to support emails with your agent.",
    longDesc: "Forward support emails to your agent and let it draft or send replies automatically. Works with any email provider via SMTP.",
    icon: Mail,
    status: "coming soon",
    color: "bg-secondary text-muted-foreground",
  },
  {
    id: "api",
    name: "API",
    description: "Build custom integrations with our REST API.",
    longDesc: "Use our REST API to send messages, manage conversations, and build custom integrations. Full API reference available in our docs.",
    icon: ExternalLink,
    status: "coming soon",
    color: "bg-secondary text-muted-foreground",
  },
];

function DashboardIntegrations() {
  const [selected, setSelected] = useState<IntegrationItem | null>(null);
  const [agents, setAgents] = useState<Chatbot[]>([]);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [smtpConfig, setSmtpConfig] = useState({ host: "", port: "587", user: "", pass: "", from: "" });
  const [copiedId, setCopiedId] = useState("");
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [savedSmtp, setSavedSmtp] = useState(false);

  const [agentsError, setAgentsError] = useState("");

  useEffect(() => {
    if (selected?.id === "website-widget" && agents.length === 0) {
      setLoadingAgents(true);
      setAgentsError("");
      listChatbots().then((bots) => setAgents(bots as unknown as Chatbot[])).catch(() => setAgentsError("Failed to load agents.")).finally(() => setLoadingAgents(false));
    }
    if (selected?.id === "email") {
      const saved = localStorage.getItem("bb_smtp_config");
      if (saved) try { setSmtpConfig(JSON.parse(saved)); } catch {}
    }
  }, [selected?.id]);

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
    }).catch(() => {});
  }

  function handleSmtpSave() {
    localStorage.setItem("bb_smtp_config", JSON.stringify(smtpConfig));
    setSavedSmtp(true);
    toast.success("SMTP configuration saved");
    setTimeout(() => setSavedSmtp(false), 2000);
  }

  function handleWaitlist() {
    if (!waitlistEmail.trim()) return;
    const list = JSON.parse(localStorage.getItem("bb_waitlist") || "[]");
    if (!list.includes(waitlistEmail.trim())) {
      list.push(waitlistEmail.trim());
      localStorage.setItem("bb_waitlist", JSON.stringify(list));
    }
    toast.success("You're on the waitlist! We'll notify you when this integration launches.");
    setWaitlistEmail("");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
          <Plug className="h-5 w-5 text-primary-foreground" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground">Connect your AI agents to the tools you use.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <button
              key={integration.id}
              onClick={() => setSelected(integration)}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-primary/40 hover:shadow-card"
            >
              <div className="flex items-start justify-between">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${integration.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                  {integration.status}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">{integration.name}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{integration.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                {integration.status === "built-in" ? "Configure" : "Learn more"}
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected.color}`}>
                  <selected.icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">{selected.name}</h2>
                  <span className="text-xs capitalize text-muted-foreground">{selected.status}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl leading-none text-muted-foreground hover:text-foreground">&times;</button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              <p className="text-sm text-muted-foreground">{selected.longDesc}</p>

              {selected.id === "website-widget" && (
                <div className="mt-5 space-y-6">
                  {/* Overview */}
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <div className="flex items-start gap-3">
                      <Globe className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">What is the Website Widget?</p>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          The Website Widget lets you add your AI agent to any website by pasting a single <code className="rounded bg-secondary px-1 font-mono">&lt;script&gt;</code> tag.
                          Visitors can chat with your agent directly from your site. You control the appearance, greeting message, and behavior from agent settings.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step-by-step guide */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">How to embed on your website</h4>

                    {/* Step 1 */}
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Create an agent</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Go to the <Link to="/dashboard" className="text-primary hover:underline">Dashboard</Link> and create a new AI agent.
                            Give it a name, write instructions (system prompt), choose a model, and set a language.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">2</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Paintbrush className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Customize appearance (optional)</p>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Open your agent's <span className="font-medium text-foreground">Settings → Appearance</span> tab. Here you can:
                          </p>
                          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                            <li className="flex items-center gap-2">• Pick a <span className="font-medium text-foreground">primary color</span> that matches your brand</li>
                            <li className="flex items-center gap-2">• Set a <span className="font-medium text-foreground">greeting message</span> (e.g. "Hi! How can I help you today?")</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">3</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Publish the agent (Live)</p>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            In <span className="font-medium text-foreground">Settings → General</span>, change the status from <span className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">Draft</span> to <span className="rounded bg-primary/20 px-1 py-0.5 font-mono text-[11px] text-primary">Live</span>.
                            The widget will only appear on your site when the agent is Live.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">4</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Get the embed code</p>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Go to <span className="font-medium text-foreground">Settings → Embed</span> or use the agent list below.
                            You'll see a script tag like this:
                          </p>
                          <pre className="mt-2 rounded-lg border border-border bg-background p-2.5 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                            {`<script src="https://botbaseai.com/widget.js" data-bot-id="YOUR_AGENT_ID"></script>`}
                          </pre>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            The <code className="rounded bg-secondary px-1 font-mono">data-bot-id</code> attribute is your agent's unique ID — it's automatically included.
                          </p>

                          {/* Custom domain option */}
                          <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-border bg-background p-3">
                            <Domain className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-medium">Custom domain</p>
                              <p className="text-xs text-muted-foreground">
                                If you're self-hosting <code className="rounded bg-secondary px-1 font-mono">widget.js</code> on your own domain, add a <code className="rounded bg-secondary px-1 font-mono">data-base-url</code> attribute:
                              </p>
                              <pre className="mt-1.5 rounded-lg border border-border bg-background p-2 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                                {`<script src="https://yourdomain.com/widget.js"
  data-bot-id="YOUR_AGENT_ID"
  data-base-url="https://yourdomain.com">
</script>`}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">5</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Paste the script on your website</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Add the script tag just before the closing <code className="rounded bg-secondary px-1 font-mono">&lt;/body&gt;</code> tag in your HTML file.
                            The widget will automatically appear as a chat bubble in the bottom-right corner of your site.
                          </p>
                          <pre className="mt-2 rounded-lg border border-border bg-background p-2.5 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">{`<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Your website content -->

  <script src="https://botbaseai.com/widget.js"
    data-bot-id="YOUR_AGENT_ID">
  </script>
</body>
</html>`}</pre>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            ✅ That's it! The widget will start working immediately. Visitors will see the chat bubble and can start chatting with your AI agent.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 6 - Security */}
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">6</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Restrict to specific domains (optional)</p>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            In <span className="font-medium text-foreground">Settings → Security</span>, add allowed domains (one per line) to prevent others from embedding your widget on their sites.
                          </p>
                          <pre className="mt-2 rounded-lg border border-border bg-background p-2.5 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">{`example.com
www.example.com`}</pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview & test */}
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <div className="flex items-start gap-3">
                      <Eye className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Preview and test your widget</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Go to the <span className="font-medium text-foreground">Widget Preview & Test</span> page for any agent to see exactly how it looks and behaves
                          on your website before deploying. You can switch between desktop and mobile views.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center"><span className="bg-card px-2 text-xs text-muted-foreground">Your Agents</span></div>
                  </div>

                  {agentsError && (
                    <div className="flex items-center justify-between rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      <span>{agentsError}</span>
                      <button onClick={() => { setAgentsError(""); setLoadingAgents(true); listChatbots().then((bots) => setAgents(bots as unknown as Chatbot[])).catch(() => setAgentsError("Failed to load agents.")).finally(() => setLoadingAgents(false)); }}
                        className="ml-3 shrink-0 rounded-lg bg-destructive/20 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/30">
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Agent list */}
                  {loadingAgents ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading agents...
                    </div>
                  ) : agents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center">
                      <Globe className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium">No agents yet</p>
                      <p className="text-xs text-muted-foreground">Create an agent first, then come back here to embed it.</p>
                      <Link to="/dashboard" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        Create agent <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {agents.map((agent) => {
                        const code = `<script src="https://botbaseai.com/widget.js" data-bot-id="${agent.id}"></script>`;
                        return (
                          <div key={agent.id} className="rounded-xl border border-border p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{agent.name}</p>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                  agent.status === "live"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-secondary text-muted-foreground"
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${agent.status === "live" ? "bg-primary" : "bg-muted-foreground"}`} />
                                  {agent.status === "live" ? "Live" : "Draft"}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleCopy(code, agent.id)}
                                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary">
                                  {copiedId === agent.id ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy code</>}
                                </button>
                                <Link to="/dashboard/agents/$id/embed-test" params={{ id: agent.id }}
                                  className="flex items-center gap-1 rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90">
                                  Preview <ArrowRight className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                            <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-2.5 text-[11px] font-mono leading-relaxed break-all whitespace-pre-wrap">
                              {code}
                            </pre>
                            {agent.status !== "live" && (
                              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                                Set status to <span className="font-medium">Live</span> in Settings for the widget to appear on your site.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {selected.id === "email" && (
                <div className="mt-5 space-y-4">
                  <h4 className="text-sm font-medium">SMTP Configuration</h4>
                  <div className="grid gap-3">
                    {(["host", "port", "user", "pass", "from"] as const).map((field) => (
                      <div key={field}>
                        <label className="text-xs font-medium text-muted-foreground capitalize">{field === "user" ? "Username" : field === "pass" ? "Password" : field}</label>
                        <input
                          value={smtpConfig[field]}
                          onChange={(e) => setSmtpConfig((prev) => ({ ...prev, [field]: e.target.value }))}
                          type={field === "pass" ? "password" : "text"}
                          placeholder={field === "host" ? "smtp.example.com" : field === "port" ? "587" : field === "user" ? "user@example.com" : field === "pass" ? "••••••••" : "agent@yourdomain.com"}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleSmtpSave}
                    className="w-full rounded-lg bg-gradient-brand py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                    {savedSmtp ? "Saved" : "Save Configuration"}
                  </button>
                  <p className="text-xs text-muted-foreground">Configuration is stored locally. Full email integration will be available soon.</p>
                </div>
              )}

              {selected.id === "api" && (
                <div className="mt-5 space-y-4">
                  <h4 className="text-sm font-medium">API Reference</h4>
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">API Access</p>
                        <p className="text-xs text-muted-foreground">Use our REST API to build custom integrations.</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Base URL:</span> <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">https://botbaseai.com/api</code></p>
                    <p><span className="font-medium">Auth:</span> <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">Bearer &lt;token&gt;</code></p>
                  </div>
                  <a href="#" className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary">
                    <ExternalLink className="h-4 w-4" /> View Full API Documentation
                  </a>
                </div>
              )}

              {(selected.id === "slack" || selected.id === "zendesk" || selected.id === "intercom") && (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-4">
                    <Bell className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Coming soon</p>
                      <p className="text-xs text-muted-foreground">We're building this integration. Join the waitlist to get notified.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button onClick={handleWaitlist}
                      className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                      Notify me
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button onClick={() => setSelected(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
