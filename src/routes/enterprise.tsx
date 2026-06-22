import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Lock, Globe, Users, Sliders, Building2, Check, Sparkles, Brain, PhoneForwarded, BarChart3 } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { AnimatedSection } from "@/components/motion/AnimatedSection";
import { StaggerContainer, staggerItem } from "@/components/motion/StaggerContainer";
import { TextReveal } from "@/components/motion/TextReveal";

export const Route = createFileRoute("/enterprise")({
  head: () => ({
    meta: [
      { title: "Enterprise — BotbaseAI" },
      { name: "description", content: "Enterprise-grade AI support platform with SSO, audit logs, compliance, and dedicated support." },
    ],
  }),
  component: Enterprise,
});

const capabilities = [
  {
    icon: Building2,
    title: "Custom Deployment",
    desc: "Dedicated infrastructure, VPC deployment, and custom data residency options for regulated industries.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    desc: "SOC 2 Type II, HIPAA readiness, GDPR compliance, and end-to-end encryption for all data in transit and at rest.",
  },
  {
    icon: Users,
    title: "Team Management",
    desc: "Role-based access control (RBAC), SAML/SSO, SCIM provisioning, and granular permission policies.",
  },
  {
    icon: Sliders,
    title: "Custom AI Control",
    desc: "Fine-tune models on your data, set custom guardrails, define escalation rules, and control response behavior.",
  },
  {
    icon: Globe,
    title: "Global Scale",
    desc: "Multi-region deployment, 99.99% uptime SLA, auto-scaling, and edge caching for low-latency responses worldwide.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    desc: "Custom dashboards, audit trails, conversation exports, and integration with your existing BI tools.",
  },
];

const securityFeatures = [
  {
    icon: Lock,
    title: "Data Encryption",
    desc: "AES-256 encryption at rest, TLS 1.3 in transit. Customer-managed encryption keys (CMEK) available.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance",
    desc: "SOC 2 Type II certified. HIPAA BAAs available. GDPR and CCPA compliant. ISO 27001 in progress.",
  },
  {
    icon: Users,
    title: "Access Control",
    desc: "SAML 2.0 / OIDC SSO, SCIM user provisioning, role-based access, and just-in-time access requests.",
  },
  {
    icon: BarChart3,
    title: "Audit Logs",
    desc: "Immutable audit trail of all agent activity, configuration changes, and user access — exportable to your SIEM.",
  },
];

const supportTiers = [
  {
    name: "Standard",
    sla: "4-hour response",
    support: "Email & chat support",
    csm: "Shared CSM",
    training: "Knowledge base & docs",
  },
  {
    name: "Premium",
    sla: "1-hour response",
    support: "Priority email, chat & phone",
    csm: "Dedicated CSM",
    training: "Onboarding workshop",
    popular: true,
  },
  {
    name: "Enterprise",
    sla: "30-minute critical response",
    support: "24/7 dedicated support",
    csm: "Senior CSM + Solutions Engineer",
    training: "Custom training & enablement",
  },
];

const integrations = [
  "Zendesk", "Salesforce", "Slack", "Microsoft Teams", "Shopify", "HubSpot",
  "ServiceNow", "Jira", "Confluence", "Notion", "Intercom", "Freshdesk",
  "Twilio", "WhatsApp", "Messenger", "Instagram", "SAP", "Oracle",
];

function Enterprise() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <div className="relative mx-auto max-w-5xl px-4 pt-24 pb-16 text-center sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> SOC 2 Type II & GDPR compliant
          </motion.div>
          <motion.h1
            className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          >
            Enterprise-grade AI support <span className="text-gradient">for global teams</span>
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            Security, compliance, and control at scale. BotbaseAI Enterprise is built for organizations with the most demanding requirements.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Contact sales <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary">
              Book a demo
            </button>
          </motion.div>
        </div>
      </section>

      <AnimatedSection className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Capabilities</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your organization needs
          </h2>
        </div>
        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <motion.div key={c.title} variants={staggerItem} className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand">
                <c.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
            </motion.div>
          ))}
        </StaggerContainer>
      </AnimatedSection>

      <AnimatedSection className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Security & compliance</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Built on a foundation of trust
            </h2>
          </div>
          <StaggerContainer className="grid gap-6 md:grid-cols-2">
            {securityFeatures.map((s) => (
              <motion.div key={s.title} variants={staggerItem} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-brand">
                    <s.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </AnimatedSection>

      <AnimatedSection className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Support</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Enterprise support plans
          </h2>
        </div>
        <StaggerContainer className="grid gap-6 md:grid-cols-3">
          {supportTiers.map((tier) => (
            <motion.div
              key={tier.name}
              variants={staggerItem}
              className={`relative rounded-2xl border bg-card p-6 ${
                tier.popular ? "border-primary shadow-card glow-primary" : "border-border"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-bold">{tier.name}</h3>
              <ul className="mt-6 space-y-4">
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">SLA</p>
                    <p className="text-xs text-muted-foreground">{tier.sla}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Support</p>
                    <p className="text-xs text-muted-foreground">{tier.support}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">CSM</p>
                    <p className="text-xs text-muted-foreground">{tier.csm}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Training</p>
                    <p className="text-xs text-muted-foreground">{tier.training}</p>
                  </div>
                </li>
              </ul>
            </motion.div>
          ))}
        </StaggerContainer>
      </AnimatedSection>

      <AnimatedSection className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Integrations</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Connects with your enterprise stack
            </h2>
          </div>
          <StaggerContainer className="flex flex-wrap justify-center gap-3" staggerDelay={0.02}>
            {integrations.map((i) => (
              <motion.span key={i} variants={staggerItem} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground">
                {i}
              </motion.span>
            ))}
          </StaggerContainer>
        </div>
      </AnimatedSection>

      <AnimatedSection className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary to-card p-12 text-center shadow-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="pointer-events-none absolute inset-0 hero-glow" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Ready for enterprise scale?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Talk to our team about a custom plan for your organization.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                Contact sales <ArrowRight className="h-4 w-4" />
              </button>
              <button className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary">
                Book a demo
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatedSection>

      <Footer />
    </div>
  );
}
