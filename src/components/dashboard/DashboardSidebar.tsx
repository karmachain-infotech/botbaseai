import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, BarChart3, MessageSquare, Plug, Settings, Sparkles } from "lucide-react";

const navItems = [
  { label: "AI Agents", to: "/dashboard", icon: Bot },
  { label: "Analytics", to: "/dashboard/analytics", icon: BarChart3 },
  { label: "Activity", to: "/dashboard/activity", icon: MessageSquare },
  { label: "Integrations", to: "/dashboard/integrations", icon: Plug },
  { label: "Settings", to: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand font-bold text-primary-foreground">
            B
          </span>
          <span className="text-lg font-bold tracking-tight">BotbaseAI</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.to === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/dashboard/" || pathname.startsWith("/dashboard/agents/")
              : pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <Link
          to="/pricing"
          className="flex items-center gap-3 rounded-lg bg-gradient-brand px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade Plan
        </Link>
      </div>
    </aside>
  );
}
