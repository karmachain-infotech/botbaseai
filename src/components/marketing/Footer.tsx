import { Link } from "@tanstack/react-router";
import { ShieldCheck, Lock } from "lucide-react";
import { motion } from "framer-motion";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/solutions" },
      { label: "Pricing", to: "/pricing" },
      { label: "Integrations", to: "/solutions" },
      { label: "Changelog", to: "/resources" },
      { label: "Documentation", to: "/resources" },
      { label: "API", to: "/resources" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", to: "/resources" },
      { label: "Guides", to: "/resources" },
      { label: "Help center", to: "/resources" },
      { label: "Community", to: "/resources" },
      { label: "Status", to: "/resources" },
      { label: "Customers", to: "/customers" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Contact", to: "/" },
      { label: "Privacy", to: "/" },
      { label: "Terms", to: "/" },
      { label: "Security", to: "/enterprise" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
            }}
          >
            <Link to="/" className="flex items-center gap-2">
              <img src="/logos.svg" alt="BotbaseAI" className="h-8 w-8" />
              <span className="text-lg font-bold tracking-tight">BotbaseAI</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The complete platform for building & deploying AI support agents for your business.
            </p>
            <div className="mt-6 flex gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" /> SOC 2 Type II
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Lock className="h-4 w-4 text-primary" /> GDPR
              </span>
            </div>
          </motion.div>

          {columns.map((col) => (
            <motion.div
              key={col.title}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
              }}
            >
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BotbaseAI, Inc. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">botbaseai.com</p>
        </div>
      </div>
    </footer>
  );
}
