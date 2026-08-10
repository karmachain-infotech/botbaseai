import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const navLinks = [
  { label: "Solutions", to: "/solutions" as const },
  { label: "Resources", to: "/resources" as const },
  { label: "Customers", to: "/customers" as const },
  { label: "Enterprise", to: "/enterprise" as const },
  { label: "Pricing", to: "/pricing" as const },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      className={`sticky top-0 z-50 border-b transition-colors ${
        scrolled ? "border-border/60" : "border-transparent"
      } ${scrolled ? "glass" : "bg-background/80 backdrop-blur-xl"}`}
      initial={{ y: prefersReduced ? 0 : -20, opacity: prefersReduced ? 1 : 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logos.svg" alt="BotbaseAI" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">BotbaseAI</span>
          </Link>
          <ul className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Build your agent for free
          </Link>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border/60 px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              to="/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-gradient-brand px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              Build your agent for free
            </Link>
          </div>
        </div>
      )}
    </motion.header>
  );
}
