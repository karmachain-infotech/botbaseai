import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Zap,
  GitCompare,
  PhoneForwarded,
  BarChart3,
  Plug,
  Globe,
  MessageSquare,
  Eye,
  Smile,
  Lock,
  Check,
  ArrowRight,
  Play,
} from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { AnimatedSection } from "@/components/motion/AnimatedSection";
import {
  StaggerContainer,
  staggerItem,
} from "@/components/motion/StaggerContainer";
import { TextReveal } from "@/components/motion/TextReveal";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { ParallaxCard } from "@/components/motion/ParallaxCard";
import { MarqueeBand } from "@/components/motion/MarqueeBand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BotbaseAI — AI agents for magical customer experiences" },
      {
        name: "description",
        content:
          "BotbaseAI is the complete platform for building & deploying AI support agents for your business.",
      },
      {
        property: "og:title",
        content: "BotbaseAI — AI agents for magical customer experiences",
      },
      {
        property: "og:description",
        content:
          "Build, train and deploy AI customer support agents in minutes. Trusted by 10,000+ businesses worldwide.",
      },
    ],
  }),
  component: Landing,
});

const highlights = [
  {
    icon: Brain,
    title: "Purpose-built for LLMs",
    desc: "Reasoning models built to solve complex customer queries with accuracy and nuance.",
  },
  {
    icon: Sparkles,
    title: "Designed for simplicity",
    desc: "Create, manage and deploy AI agents easily — no technical skills required.",
  },
  {
    icon: ShieldCheck,
    title: "Engineered for security",
    desc: "Enterprise-grade encryption and compliance keep your data protected end to end.",
  },
];

const steps = [
  {
    n: "01",
    title: "Build & deploy your agent",
    desc: "Train an AI agent on your data and embed it in minutes.",
  },
  {
    n: "02",
    title: "Agent solves your customers' problems",
    desc: "It answers questions and takes actions 24/7.",
  },
  {
    n: "03",
    title: "Refine & optimize",
    desc: "Use insights to continuously improve your agent.",
  },
  {
    n: "04",
    title: "Route complex issues to a human",
    desc: "Smart escalation hands off when needed.",
  },
  {
    n: "05",
    title: "Review analytics & insights",
    desc: "Measure resolution rate, CSAT and more.",
  },
];

const features = [
  {
    icon: RefreshCw,
    title: "Sync with real-time data",
    desc: "Connect your CRM, order management and helpdesk for live answers.",
  },
  {
    icon: Zap,
    title: "Take actions & automate workflows",
    desc: "Let your agent perform tasks across your connected systems.",
  },
  {
    icon: GitCompare,
    title: "Compare AI models",
    desc: "Test and choose the best model for your use case.",
  },
  {
    icon: PhoneForwarded,
    title: "Smart escalation",
    desc: "Define natural language rules for human handoff.",
  },
  {
    icon: BarChart3,
    title: "Advanced reporting",
    desc: "Deep analytics into conversations and performance.",
  },
  {
    icon: Plug,
    title: "Works with your tools",
    desc: "Native integrations with the tools your team already uses.",
  },
];

const integrations = [
  "Make",
  "Zendesk",
  "Notion",
  "Slack",
  "Stripe",
  "Salesforce",
  "Cal.com",
  "Calendly",
  "WhatsApp",
  "Zapier",
  "Messenger",
  "Twilio",
  "Shopify",
  "Instagram",
  "WordPress",
];

const exploreTabs = [
  "Playground",
  "Analytics",
  "Activity",
  "Sources",
  "Actions",
];

const benefits = [
  {
    icon: Smile,
    title: "Personalized customer experience",
    desc: "Tailored answers using your customer's context and history.",
  },
  {
    icon: Zap,
    title: "Instant actions & workflow automation",
    desc: "Resolve issues by doing, not just answering.",
  },
  {
    icon: MessageSquare,
    title: "Empathetic & on-brand",
    desc: "Responses match your tone of voice every time.",
  },
  {
    icon: PhoneForwarded,
    title: "Smart escalations",
    desc: "Seamlessly bring a human in when it matters.",
  },
  {
    icon: Eye,
    title: "Observability",
    desc: "Full visibility into every conversation and decision.",
  },
];

const enterprise = [
  {
    icon: Globe,
    title: "Omnichannel",
    desc: "Works across all your customer channels.",
  },
  {
    icon: Lock,
    title: "Secure by default",
    desc: "Encryption, SSO and granular controls built in.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-grade guardrails",
    desc: "Keep your agent safe, accurate and on-policy.",
  },
  {
    icon: Brain,
    title: "Handles unclear requests",
    desc: "Understands ambiguous questions gracefully.",
  },
  {
    icon: Globe,
    title: "Multilingual support",
    desc: "Engage customers in 80+ languages.",
  },
];

const testimonials = [
  {
    quote:
      "BotbaseAI lets our team resolve support at a scale we never thought possible.",
    name: "Head of Support",
    company: "OpenAI",
  },
  {
    quote:
      "We deployed our agent in a day and cut response times dramatically.",
    name: "VP Customer Experience",
    company: "Sage",
  },
  {
    quote: "Our customers love the instant, accurate answers from BotbaseAI.",
    name: "Director of Operations",
    company: "Chuck E Cheese",
  },
  {
    quote: "An essential part of our customer support stack.",
    name: "Support Lead",
    company: "Synergym",
  },
];

const security = [
  {
    title: "Your data stays yours",
    desc: "We never train foundation models on your data.",
  },
  {
    title: "Data encryption",
    desc: "Encrypted at rest and in transit, always.",
  },
  {
    title: "Secure integrations",
    desc: "Connect tools with scoped, revocable access.",
  },
];

function Landing() {
  const [activeTab, setActiveTab] = useState(exploreTabs[0]);
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <div className="relative mx-auto max-w-5xl px-4 pt-24 pb-16 text-center sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const }}
          >
            <img
              src="/logotext.png"
              alt="BotbaseAI"
              className="mx-auto h-auto max-h-24"
            />
          </motion.div>
          <motion.div
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: 0.15,
              ease: [0.25, 0.1, 0.25, 1] as const,
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Now with reasoning
            models
          </motion.div>
          <motion.h1
            className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.25,
              ease: [0.25, 0.1, 0.25, 1] as const,
            }}
          >
            AI agents for{" "}
            <span className="text-gradient">magical customer experiences</span>
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.35,
              ease: [0.25, 0.1, 0.25, 1] as const,
            }}
          >
            BotbaseAI is the complete platform for building & deploying AI
            support agents for your business.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.45,
              ease: [0.25, 0.1, 0.25, 1] as const,
            }}
          >
            <MagneticButton className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary">
              Book a demo
            </MagneticButton>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Build your agent for free <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Video placeholder */}
          <ParallaxCard
            intensity={4}
            className="mt-16 aspect-video w-full overflow-hidden rounded-2xl border border-border bg-card shadow-card glow-primary"
          >
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              <img
                src="/explore-playground.png"
                alt="BotbaseAI demo"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
              <button
                onClick={() => setShowVideo(true)}
                className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground transition-transform hover:scale-105"
              >
                <Play className="h-6 w-6 translate-x-0.5" />
              </button>
            </div>
          </ParallaxCard>
        </div>
      </section>

      {/* Video modal */}
      {showVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative aspect-video w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src="https://www.youtube.com/embed/3SWYin4SYtE?autoplay=1"
              className="h-full w-full rounded-2xl shadow-2xl"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Social proof */}
      <motion.section
        className="border-y border-border/60 py-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-muted-foreground">
            Trusted by 10,000+ businesses worldwide
          </p>
          <MarqueeBand className="mt-6" baseSpeed={15}>
            {[
              "OpenAI",
              "Sage",
              "Chuck E Cheese",
              "Synergym",
              "Postman",
              "Siemens",
            ].map((logo) => (
              <span
                key={logo}
                className="text-lg font-bold tracking-tight text-muted-foreground opacity-70"
              >
                {logo}
              </span>
            ))}
          </MarqueeBand>
        </div>
      </motion.section>

      {/* Highlights */}
      <Section>
        <StaggerContainer className="grid gap-6 md:grid-cols-3">
          {highlights.map((h) => (
            <motion.div
              key={h.title}
              variants={staggerItem}
              className="rounded-2xl border border-border bg-card p-8 shadow-card"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand">
                <h.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{h.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{h.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </Section>

      {/* How it works */}
      <Section>
        <Heading
          eyebrow="How it works"
          title="From data to deployed agent in five steps"
        />
        <div className="grid gap-10 lg:grid-cols-2">
          <StaggerContainer className="space-y-4" staggerDelay={0.06}>
            {steps.map((s) => (
              <motion.div
                key={s.n}
                variants={staggerItem}
                className="flex gap-4 rounded-xl border border-border bg-card p-5"
              >
                <span className="text-gradient text-2xl font-extrabold">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
          <motion.div
            className="aspect-square overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:aspect-auto"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
          >
            <img
              src="/how-it-works.png"
              alt="How BotbaseAI works"
              className="h-full w-full object-cover"
            />
          </motion.div>
        </div>
      </Section>

      {/* Features */}
      <Section>
        <Heading
          eyebrow="Features"
          title="Everything you need to deliver world-class support"
        />
        <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={staggerItem}
              className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-card hover:-translate-y-1"
            >
              <f.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const }}
        >
          {integrations.map((i) => (
            <span
              key={i}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              {i}
            </span>
          ))}
        </motion.div>
      </Section>

      {/* Explore tabbed */}
      <Section>
        <Heading eyebrow="Explore" title="See BotbaseAI in action" />
        <div className="mx-auto mb-8 flex max-w-2xl flex-wrap justify-center gap-2">
          {exploreTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-gradient-brand text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <img
            src={`/explore-${activeTab.toLowerCase()}.png`}
            alt={`${activeTab} preview`}
            className="h-full w-full object-cover"
          />
        </div>
      </Section>

      {/* Benefits */}
      <Section>
        <Heading eyebrow="Benefits" title="Why teams choose BotbaseAI" />
        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <motion.div
              key={b.title}
              variants={staggerItem}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </Section>

      {/* Enterprise */}
      <Section>
        <Heading
          eyebrow="Enterprise"
          title="Built for scale, security and global teams"
        />
        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {enterprise.map((e) => (
            <motion.div
              key={e.title}
              variants={staggerItem}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <e.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 font-semibold">{e.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{e.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </Section>

      {/* Testimonials */}
      <Section>
        <Heading
          eyebrow="Customers"
          title="Loved by support teams everywhere"
        />
        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <motion.div
              key={t.company}
              variants={staggerItem}
              className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-card"
            >
              <p className="text-pretty text-foreground">“{t.quote}”</p>
              <div className="mt-5">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.company}</p>
              </div>
            </motion.div>
          ))}
        </StaggerContainer>
      </Section>

      {/* Security */}
      <Section>
        <motion.div
          className="rounded-3xl border border-border bg-card p-10 shadow-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
        >
          <motion.div
            className="flex flex-col items-center gap-4 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" /> SOC 2 Type II
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium">
                <Lock className="h-4 w-4 text-primary" /> GDPR
              </span>
            </div>
            <h2 className="max-w-xl text-3xl font-bold tracking-tight">
              Security and privacy you can trust
            </h2>
          </motion.div>
          <StaggerContainer className="mt-10 grid gap-6 md:grid-cols-3">
            {security.map((s) => (
              <motion.div
                key={s.title}
                variants={staggerItem}
                className="rounded-xl border border-border bg-secondary/50 p-6"
              >
                <Check className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </StaggerContainer>
        </motion.div>
      </Section>

      {/* CTA banner */}
      <Section>
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary to-card p-12 text-center shadow-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
        >
          <div className="pointer-events-none absolute inset-0 hero-glow" />
          <div className="relative">
            <motion.h2
              className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              Make customer service your competitive edge
            </motion.h2>
            <motion.div
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Build your agent for free <ArrowRight className="h-4 w-4" />
              </Link>
              <button className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary">
                Book a demo
              </button>
            </motion.div>
          </div>
        </motion.div>
      </Section>

      <Footer />
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <AnimatedSection className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      {children}
    </AnimatedSection>
  );
}

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div
      className="mb-12 text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const }}
    >
      <motion.p
        className="text-sm font-semibold uppercase tracking-wider text-primary"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {eyebrow}
      </motion.p>
      <TextReveal
        as="h2"
        className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl"
      >
        {title}
      </TextReveal>
    </motion.div>
  );
}
