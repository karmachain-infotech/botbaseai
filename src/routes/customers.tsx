import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Star, Quote, TrendingUp, Clock, ShieldCheck, Users, MessageSquare } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — BotbaseAI" },
      { name: "description", content: "See how thousands of businesses use BotbaseAI to transform their customer support." },
    ],
  }),
  component: Customers,
});

const stats = [
  { icon: MessageSquare, value: "10,000+", label: "Businesses onboarded" },
  { icon: TrendingUp, value: "70%", label: "Average ticket deflection" },
  { icon: Clock, value: "< 5 min", label: "Average first response time" },
  { icon: Users, value: "98%", label: "Customer satisfaction rate" },
];

const featuredStory = {
  company: "OpenAI",
  logo: "O",
  quote: "BotbaseAI lets our team resolve support at a scale we never thought possible. The AI agents handle the majority of inquiries autonomously, freeing our human team to focus on complex issues that require deep expertise.",
  name: "Sarah Chen",
  role: "Head of Support",
  results: [
    { metric: "85%", desc: "Automated resolution rate" },
    { metric: "3x", desc: "Faster response times" },
    { metric: "40%", desc: "Reduction in support costs" },
  ],
};

const caseStudies = [
  {
    company: "Sage",
    industry: "Fintech",
    logo: "S",
    quote: "We deployed our agent in a day and cut response times dramatically. Our customers get instant answers to common questions, and our team can focus on high-value conversations.",
    name: "Marcus Webb",
    role: "VP Customer Experience",
    results: ["92% CSAT", "4.2min avg response", "60% deflection"],
  },
  {
    company: "Chuck E Cheese",
    industry: "Entertainment",
    logo: "C",
    quote: "Our customers love the instant, accurate answers from BotbaseAI. We've seen a significant boost in satisfaction scores since deploying the agent across our support channels.",
    name: "Jessica Torres",
    role: "Director of Operations",
    results: ["4.9/5 rating", "24/7 coverage", "50% fewer emails"],
  },
  {
    company: "Synergym",
    industry: "Health & Fitness",
    logo: "S",
    quote: "An essential part of our customer support stack. The multilingual capabilities let us serve our global member base without hiring additional support staff.",
    name: "Alex Rivera",
    role: "Support Lead",
    results: ["80% auto-resolution", "6 languages", "35% cost savings"],
  },
  {
    company: "Postman",
    industry: "Developer Tools",
    logo: "P",
    quote: "The API-first approach of BotbaseAI integrates seamlessly with our existing toolchain. We automated developer onboarding and reduced ticket volume by half.",
    name: "Dylan Kim",
    role: "Developer Experience Lead",
    results: ["55% deflection", "API-native", "Dev portal integration"],
  },
  {
    company: "Siemens",
    industry: "Industrial",
    logo: "S",
    quote: "Enterprise-grade security was our top concern. BotbaseAI's SOC 2 compliance and data encryption gave us the confidence to deploy across our global support operation.",
    name: "Dr. Helena Müller",
    role: "Digital Transformation Lead",
    results: ["Global rollout", "SOC 2 compliant", "Enterprise SSO"],
  },
];

const logos = [
  "OpenAI", "Sage", "Chuck E Cheese", "Synergym", "Postman", "Siemens",
  "Make", "Zendesk", "Notion", "Slack", "Stripe", "Salesforce",
];

function Customers() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <div className="relative mx-auto max-w-5xl px-4 pt-24 pb-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            Trusted by <span className="text-gradient">10,000+ businesses</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            From startups to enterprises, teams everywhere use BotbaseAI to deliver remarkable customer experiences.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand">
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-gradient">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Featured story</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              How {featuredStory.company} scales support with AI
            </h2>
          </div>
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card lg:p-12">
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-brand text-xl font-bold text-primary-foreground">
                  {featuredStory.logo}
                </div>
                <Quote className="mt-6 h-8 w-8 text-primary/40" />
                <p className="mt-4 text-lg leading-relaxed text-foreground">
                  "{featuredStory.quote}"
                </p>
                <div className="mt-6">
                  <p className="font-semibold">{featuredStory.name}</p>
                  <p className="text-sm text-muted-foreground">{featuredStory.role}, {featuredStory.company}</p>
                </div>
                <div className="mt-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold">Key results</h3>
                {featuredStory.results.map((r) => (
                  <div key={r.metric} className="rounded-xl border border-border bg-secondary/50 p-5">
                    <p className="text-2xl font-extrabold text-gradient">{r.metric}</p>
                    <p className="text-sm text-muted-foreground">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Case studies</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            See how teams use BotbaseAI
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {caseStudies.map((cs) => (
            <div key={cs.company} className="group cursor-pointer rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-sm font-bold text-primary-foreground">
                  {cs.logo}
                </div>
                <span className="rounded-full border border-border bg-secondary px-3 py-0.5 text-xs text-muted-foreground">
                  {cs.industry}
                </span>
              </div>
              <p className="mt-4 text-sm italic text-muted-foreground">
                "{cs.quote}"
              </p>
              <div className="mt-4">
                <p className="text-sm font-semibold">{cs.name}</p>
                <p className="text-xs text-muted-foreground">{cs.role}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                {cs.results.map((r) => (
                  <span key={r} className="rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-primary">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Trusted by industry leaders</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
            {logos.map((logo) => (
              <span key={logo} className="text-lg font-bold tracking-tight text-muted-foreground">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary to-card p-12 text-center shadow-card">
          <div className="pointer-events-none absolute inset-0 hero-glow" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Join thousands of businesses already using BotbaseAI
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Build your agent for free <ArrowRight className="h-4 w-4" />
              </Link>
              <button className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary">
                Book a demo
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
