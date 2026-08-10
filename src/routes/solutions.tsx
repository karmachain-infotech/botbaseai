import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Brain,
  Zap,
  MessageSquare,
  BarChart3,
  Globe,
  Plug,
  ShieldCheck,
  GitCompare,
  PhoneForwarded,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: "Solutions — BotbaseAI" },
      {
        name: "description",
        content:
          "See how BotbaseAI's AI agents transform customer support across every channel.",
      },
    ],
  }),
  component: Solutions,
});

const useCases = [
  {
    icon: MessageSquare,
    title: "Customer Support Automation",
    desc: "Resolve 70%+ of incoming tickets instantly with AI agents trained on your knowledge base, past conversations, and product docs.",
    features: [
      "24/7 instant responses",
      "Multi-channel support",
      "Smart ticket routing",
      "Sentiment analysis",
    ],
  },
  {
    icon: Zap,
    title: "Sales & Lead Qualification",
    desc: "Qualify leads, answer product questions, and book meetings automatically — your AI agent works your pipeline around the clock.",
    features: [
      "Lead scoring & routing",
      "Product recommendations",
      "Calendar booking",
      "Follow-up automation",
    ],
  },
  {
    icon: Brain,
    title: "Knowledge Management",
    desc: "Turn your docs, wikis, and help articles into an intelligent Q&A agent that serves accurate answers to your team and customers.",
    features: [
      "Auto-sync with sources",
      "Semantic search",
      "Citation-backed answers",
      "Auto-refresh on content change",
    ],
  },
  {
    icon: Globe,
    title: "Multilingual Support",
    desc: "Serve customers in 80+ languages with the same AI agent — no translation middleware or separate bots needed.",
    features: [
      "Real-time translation",
      "Language auto-detection",
      "Consistent tone across languages",
      "Regional compliance",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    desc: "Understand what customers are asking about, track resolution rates, and identify gaps in your knowledge base.",
    features: [
      "Conversation analytics",
      "Trend detection",
      "CSAT tracking",
      "Knowledge gap reports",
    ],
  },
  {
    icon: PhoneForwarded,
    title: "Human Handoff & Escalation",
    desc: "When the AI can't resolve an issue, it seamlessly hands off to a human agent with full conversation context.",
    features: [
      "Smart escalation rules",
      "Context-rich handoff",
      "Co-browsing mode",
      "Agent inbox integration",
    ],
  },
];

const channels = [
  { name: "Web Widget", desc: "Embed on your site in minutes" },
  { name: "Slack", desc: "Support your team internally" },
  { name: "WhatsApp", desc: "Meet customers where they are" },
  { name: "Zendesk", desc: "Integrate with your help desk" },
  { name: "Messenger", desc: "Connect Facebook pages" },
  { name: "API", desc: "Build custom integrations" },
];

function Solutions() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <div className="relative mx-auto max-w-5xl px-4 pt-24 pb-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            Solutions for every{" "}
            <span className="text-gradient">support challenge</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            From automated ticketing to multilingual support, BotbaseAI
            transforms how your team serves customers.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Build your agent for free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Use cases
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            One platform, endless possibilities
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {useCases.map((u) => (
            <div
              key={u.title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand">
                <u.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{u.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{u.desc}</p>
              <ul className="mt-4 space-y-2">
                {u.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Channels
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Deploy anywhere your customers are
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-sm font-bold text-primary-foreground">
                  {c.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-secondary to-card p-12 text-center shadow-card">
          <div className="pointer-events-none absolute inset-0 hero-glow" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to transform your support?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Get started free — no credit card required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Build your agent for free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
