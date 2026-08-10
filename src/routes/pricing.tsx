import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Minus, ArrowRight, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { useAuth } from "@/lib/auth-context";
import {
  createCheckoutSession,
  getPriceIds,
} from "@/lib/server-functions/stripe";
import { track } from "@/lib/analytics";
import { AnimatedSection } from "@/components/motion/AnimatedSection";
import {
  StaggerContainer,
  staggerItem,
} from "@/components/motion/StaggerContainer";
import { ParallaxCard } from "@/components/motion/ParallaxCard";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — BotbaseAI" },
      {
        description:
          "Predictable pricing and scalable plans for AI support agents.",
      },
    ],
  }),
  component: Pricing,
});

type Plan = {
  name: string;
  monthly: number | null;
  yearly: number | null;
  blurb: string;
  cta: string;
  popular?: boolean;
  features: string[];
};

function getPlanPrice(
  name: string,
  interval: "monthly" | "yearly",
): number | null {
  if (name === "Free") return 0;
  if (name === "Enterprise") return null;
  const key = `VITE_PLAN_PRICE_${name.toUpperCase()}_${interval.toUpperCase()}`;
  const raw = import.meta.env[key] as string | undefined;
  const parsed = parseInt(raw ?? "", 10);
  return isNaN(parsed) ? null : parsed;
}

const plans: Plan[] = [
  {
    name: "Free",
    monthly: 0,
    yearly: 0,
    blurb: "Get started and explore the platform.",
    cta: "Get started",
    features: [
      "50 message credits/month",
      "1 AI agent",
      "0 AI Actions per agent",
      "400 KB training content",
      "1 member",
      "Limited models only",
      "Agents deleted after 14 days inactivity",
    ],
  },
  {
    name: "Hobby",
    monthly: getPlanPrice("Hobby", "monthly"),
    yearly: getPlanPrice("Hobby", "yearly"),
    blurb: "For individuals getting serious.",
    cta: "Subscribe",
    features: [
      "500 message credits/month",
      "1 agent, 5 AI Actions per agent",
      "10 MB training content",
      "2 members",
      "Advanced models",
      "Integrations",
      "Basic analytics",
      "Attachments",
    ],
  },
  {
    name: "Standard",
    monthly: getPlanPrice("Standard", "monthly"),
    yearly: getPlanPrice("Standard", "yearly"),
    blurb: "For growing support teams.",
    cta: "Subscribe",
    popular: true,
    features: [
      "4,000 message credits/month",
      "1 agent, 8 AI Actions per agent",
      "20 MB training content",
      "3 members",
      "Help desk, Voice, Telephony",
      "Outbound campaigns",
      "API access, Personalization",
      "Auto retrain agents",
      "All integrations",
    ],
  },
  {
    name: "Pro",
    monthly: getPlanPrice("Pro", "monthly"),
    yearly: getPlanPrice("Pro", "yearly"),
    blurb: "For high-volume operations.",
    cta: "Subscribe",
    features: [
      "15,000 message credits/month",
      "1 agent, 12 AI Actions per agent",
      "40 MB training content",
      "5 members",
      "Advanced analytics",
      "Sources suggestions",
      "Tickets as source",
    ],
  },
  {
    name: "Enterprise",
    monthly: null,
    yearly: null,
    blurb: "For organizations with custom needs.",
    cta: "Let's Talk",
    features: [
      "Everything in Pro",
      "Higher limits",
      "Custom roles, SSO",
      "White-labeling",
      "Audit logs",
      "Priority support, CSM",
      "SLAs, HIPAA",
    ],
  },
];

const addOns = [
  {
    title: "Auto recharge credits",
    price: "$40",
    unit: "per 1,000 message credits",
  },
  { title: "Extra agents", price: "$300", unit: "per agent / year" },
  { title: 'Remove "Powered By BotbaseAI"', price: "$1,188", unit: "per year" },
];

const comparison = [
  {
    section: "Usage",
    rows: [
      {
        label: "Message credits / mo",
        values: ["50", "500", "4,000", "15,000", "Custom"],
      },
      { label: "AI agents", values: ["1", "1", "1", "1", "Custom"] },
      { label: "AI Actions / agent", values: ["0", "5", "8", "12", "Custom"] },
      {
        label: "Training content",
        values: ["400 KB", "10 MB", "20 MB", "40 MB", "Custom"],
      },
      { label: "Team members", values: ["1", "2", "3", "5", "Custom"] },
    ],
  },
  {
    section: "Features",
    rows: [
      { label: "Advanced models", values: ["—", "✓", "✓", "✓", "✓"] },
      { label: "Integrations", values: ["—", "✓", "✓", "✓", "✓"] },
      { label: "Basic analytics", values: ["—", "✓", "✓", "✓", "✓"] },
      { label: "Advanced analytics", values: ["—", "—", "—", "✓", "✓"] },
      { label: "API access", values: ["—", "—", "✓", "✓", "✓"] },
      { label: "Auto retrain agents", values: ["—", "—", "✓", "✓", "✓"] },
      {
        label: "Help desk, Voice, Telephony",
        values: ["—", "—", "✓", "✓", "✓"],
      },
      { label: "SSO & White-labeling", values: ["—", "—", "—", "—", "✓"] },
      { label: "SLAs & HIPAA", values: ["—", "—", "—", "—", "✓"] },
    ],
  },
];

const faqs = [
  {
    q: "What is a message credit?",
    a: "Each reply your AI agent sends to a customer consumes one message credit. Credits reset at the start of every billing cycle.",
  },
  {
    q: "Do credits roll over?",
    a: "Unused message credits do not roll over to the next month. You can enable auto recharge to never run out.",
  },
  {
    q: "When do my credits renew?",
    a: "Credits renew on your billing renewal date — monthly or yearly depending on your plan.",
  },
  {
    q: "Can I add more team members?",
    a: "Yes. Each plan includes a number of members, and you can add extra agents and seats with add-ons.",
  },
  {
    q: "How much data can I train on?",
    a: "Training content limits vary by plan, from 400 KB on Free up to 40 MB on Pro, with custom limits on Enterprise.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Absolutely. You can upgrade, downgrade or cancel at any time from your billing settings.",
  },
];

function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [priceIds, setPriceIds] = useState<
    Record<string, { monthly: string; yearly: string }>
  >({});

  useEffect(() => {
    getPriceIds()
      .then((ids) => {
        const mapped: Record<string, { monthly: string; yearly: string }> = {};
        for (const [plan, variants] of Object.entries(ids)) {
          if (variants.monthly) mapped[plan] = variants;
        }
        setPriceIds(mapped);
      })
      .catch(() => {});
  }, []);

  function getPlanPriceId(
    plan: Plan,
  ): { monthly: string; yearly: string } | undefined {
    return priceIds[plan.name.toLowerCase()];
  }

  async function handleSubscribe(plan: Plan) {
    const pid = getPlanPriceId(plan);
    if (!pid) {
      setError("Pricing config not loaded. Please try again.");
      return;
    }
    setError("");

    if (!user) {
      navigate({ to: "/signup" });
      return;
    }

    setLoading(plan.name);
    track("checkout_initiated", {
      plan: plan.name,
      interval: yearly ? "yearly" : "monthly",
    });

    try {
      const priceId = yearly ? pid.yearly : pid.monthly;
      const result = await createCheckoutSession({
        data: {
          priceId,
          plan: plan.name,
          interval: yearly ? "yearly" : "monthly",
          successUrl: `${window.location.origin}/dashboard`,
          cancelUrl: `${window.location.origin}/pricing`,
        },
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Something went wrong. Please try again.");
    }
    setLoading(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <div className="relative mx-auto max-w-4xl px-4 pt-20 pb-10 text-center sm:px-6 lg:px-8">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Predictable pricing,{" "}
            <span className="text-gradient">scalable plans</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Start free and upgrade as your support grows. Save 20% with yearly
            billing.
          </p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !yearly
                  ? "bg-gradient-brand text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                yearly
                  ? "bg-gradient-brand text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Yearly <span className="ml-1 text-xs opacity-80">-20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}
        <StaggerContainer
          className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
          staggerDelay={0.05}
        >
          {plans.map((p) => (
            <ParallaxCard
              key={p.name}
              intensity={4}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
                p.popular
                  ? "border-primary shadow-card glow-primary"
                  : "border-border"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{p.blurb}</p>
              <div className="mt-4">
                {p.monthly === null ? (
                  <span className="text-3xl font-extrabold">Custom</span>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold">
                      ${yearly ? Math.round((p.yearly ?? 0) / 12) : p.monthly}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                    {yearly && p.yearly ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        billed ${p.yearly.toLocaleString()}/yr
                      </p>
                    ) : null}
                  </>
                )}
              </div>
              {p.name === "Free" ? (
                <Link
                  to="/signup"
                  className="mt-5 inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
                >
                  Get started
                </Link>
              ) : p.name === "Enterprise" ? (
                <Link
                  to="/"
                  className="mt-5 inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
                >
                  Let's Talk
                </Link>
              ) : (
                <button
                  onClick={() => handleSubscribe(p)}
                  disabled={loading === p.name}
                  className={`mt-5 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    p.popular
                      ? "bg-gradient-brand text-primary-foreground hover:opacity-90"
                      : "border border-border bg-secondary hover:bg-accent"
                  } disabled:opacity-60`}
                >
                  {loading === p.name ? "Redirecting..." : p.cta}
                </button>
              )}
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </ParallaxCard>
          ))}
        </StaggerContainer>
      </section>

      {/* Add-ons */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
          Add-ons
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {addOns.map((a) => (
            <div
              key={a.title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h3 className="font-semibold">{a.title}</h3>
              <p className="mt-3 text-2xl font-extrabold text-gradient">
                {a.price}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{a.unit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
          Compare all features
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="p-4 text-left font-semibold">Feature</th>
                {plans.map((p) => (
                  <th key={p.name} className="p-4 text-center font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((sec) => (
                <Fragment key={sec.section}>
                  <tr className="bg-secondary/40">
                    <td
                      colSpan={6}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary"
                    >
                      {sec.section}
                    </td>
                  </tr>
                  {sec.rows.map((row) => (
                    <tr key={row.label} className="border-b border-border/60">
                      <td className="p-4 text-muted-foreground">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="p-4 text-center">
                          {v === "✓" ? (
                            <Check className="mx-auto h-4 w-4 text-primary" />
                          ) : v === "—" ? (
                            <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
                          ) : (
                            <span className="text-foreground">{v}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={f.q} className="rounded-xl border border-border bg-card">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-medium">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {openFaq === i && (
                <p className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary to-card p-12 text-center shadow-card">
          <div className="pointer-events-none absolute inset-0 hero-glow" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight">
              Make customer service your competitive edge
            </h2>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Build your agent for free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
