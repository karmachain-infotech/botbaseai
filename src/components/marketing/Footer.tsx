import { Link } from "@tanstack/react-router";
import { ShieldCheck, Lock } from "lucide-react";

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
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand font-bold text-primary-foreground">
                B
              </span>
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
          </div>

          {columns.map((col) => (
            <div key={col.title}>
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
            </div>
          ))}
        </div>

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
