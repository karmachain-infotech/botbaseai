import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  HelpCircle,
  Users,
  Radio,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — BotbaseAI" },
      {
        name: "description",
        content:
          "Guides, tutorials, docs and community resources for building better AI support agents.",
      },
    ],
  }),
  component: Resources,
});

const categories = [
  {
    icon: BookOpen,
    title: "Documentation",
    desc: "In-depth guides on training, deploying, and managing your AI agents.",
    articles: [
      "Getting started with BotbaseAI",
      "Training your agent on custom data",
      "Setting up AI Actions & workflows",
      "Integrating with Slack, Zendesk & more",
      "Analytics & performance tracking",
    ],
  },
  {
    icon: GraduationCap,
    title: "Guides & Tutorials",
    desc: "Step-by-step walkthroughs for common use cases and best practices.",
    articles: [
      "How to cut support tickets by 70%",
      "Building a multilingual support agent",
      "Automating lead qualification",
      "Setting up smart escalations",
      "Optimizing agent response quality",
    ],
  },
  {
    icon: HelpCircle,
    title: "Help Center",
    desc: "Troubleshooting, FAQs, and tips from the BotbaseAI team.",
    articles: [
      "Troubleshooting common issues",
      "Understanding message credits",
      "Managing team members & roles",
      "Billing & subscription FAQs",
      "Data privacy & security overview",
    ],
  },
  {
    icon: Users,
    title: "Community",
    desc: "Join thousands of builders sharing tips, templates, and ideas.",
    articles: [
      "Community forums",
      "Feature requests & voting",
      "Showcase: what others built",
      "Community templates",
      "Events & webinars",
    ],
  },
  {
    icon: Radio,
    title: "Changelog",
    desc: "Stay up to date with the latest features, improvements, and fixes.",
    articles: [
      "Reasoning model support (latest)",
      "New: analytics dashboard v2",
      "Slack integration improvements",
      "API rate limit updates",
      "Security enhancements",
    ],
  },
  {
    icon: FileText,
    title: "API Reference",
    desc: "Build custom integrations with the BotbaseAI API.",
    articles: [
      "API overview & authentication",
      "Chat completion endpoints",
      "Agent management API",
      "Webhook events & payloads",
      "Rate limits & pagination",
    ],
  },
];

const popularGuides = [
  {
    title: "How to train your AI agent in 5 minutes",
    desc: "Get your first agent online fast with our quickstart guide.",
    readTime: "5 min read",
  },
  {
    title: "Best practices for AI support agents",
    desc: "Learn how top teams configure their agents for maximum resolution rates.",
    readTime: "10 min read",
  },
  {
    title: "Integrating BotbaseAI with your stack",
    desc: "Connect your CRM, help desk, and communication tools in minutes.",
    readTime: "8 min read",
  },
];

function Resources() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <div className="relative mx-auto max-w-5xl px-4 pt-24 pb-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            Resources to help you{" "}
            <span className="text-gradient">build better agents</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Documentation, guides, tutorials, and community resources —
            everything you need to succeed with BotbaseAI.
          </p>
          <div className="mx-auto mt-8 flex max-w-lg items-center gap-2 rounded-xl border border-border bg-card p-2">
            <Search className="ml-2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documentation, guides, FAQs..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              readOnly
            />
            <span className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-medium text-primary-foreground">
              Search
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Popular guides
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Start here
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {popularGuides.map((g) => (
            <div
              key={g.title}
              className="group cursor-pointer rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  {g.readTime}
                </span>
              </div>
              <h3 className="mt-3 font-semibold group-hover:text-primary transition-colors">
                {g.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{g.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              All resources
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Browse by category
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <div
                key={cat.title}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand">
                  <cat.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="mt-4 font-semibold">{cat.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{cat.desc}</p>
                <ul className="mt-4 space-y-2">
                  {cat.articles.map((a) => (
                    <li
                      key={a}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <span className="h-1 w-1 rounded-full bg-primary/60" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary to-card p-12 text-center shadow-card">
          <div className="pointer-events-none absolute inset-0 hero-glow" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Still have questions?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Our support team is here to help you get the most out of
              BotbaseAI.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <button className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary">
                Contact support
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
