import { createFileRoute, Link } from "@tanstack/react-router";
import { Plug, ArrowLeft, ExternalLink, Globe, MessageCircle, Mail, Slack } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — BotbaseAI" },
      { name: "description", content: "Connect your AI agents to your favorite tools." },
    ],
  }),
  component: DashboardIntegrations,
});

const integrations = [
  {
    name: "Website Widget",
    description: "Embed your agent on any website with a snippet.",
    icon: Globe,
    status: "built-in",
    color: "bg-primary/10 text-primary",
  },
  {
    name: "Slack",
    description: "Connect your agent to Slack channels.",
    icon: Slack,
    status: "coming soon",
    color: "bg-secondary text-muted-foreground",
  },
  {
    name: "Zendesk",
    description: "Sync conversations with Zendesk tickets.",
    icon: MessageCircle,
    status: "coming soon",
    color: "bg-secondary text-muted-foreground",
  },
  {
    name: "Intercom",
    description: "Connect your agent with Intercom messenger.",
    icon: MessageCircle,
    status: "coming soon",
    color: "bg-secondary text-muted-foreground",
  },
  {
    name: "Email",
    description: "Reply to support emails with your agent.",
    icon: Mail,
    status: "coming soon",
    color: "bg-secondary text-muted-foreground",
  },
  {
    name: "API",
    description: "Build custom integrations with our REST API.",
    icon: ExternalLink,
    status: "coming soon",
    color: "bg-secondary text-muted-foreground",
  },
];

function DashboardIntegrations() {
  const [connected] = useState<string[]>(["Website Widget"]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Plug className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground">Connect your AI agents to the tools you use.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const isConnected = connected.includes(integration.name);
          const Icon = integration.icon;
          return (
            <div
              key={integration.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
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
              <button
                disabled={integration.status === "coming soon"}
                className={`mt-4 w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                  isConnected
                    ? "bg-secondary text-foreground hover:bg-secondary/80"
                    : "bg-gradient-brand text-primary-foreground hover:opacity-90 disabled:opacity-40"
                }`}
              >
                {isConnected ? "Configure" : integration.status === "coming soon" ? "Coming soon" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
