import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  BarChart3,
  MessageSquare,
  Plug,
  Settings,
  Sparkles,
  X,
  Monitor,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublicPlatformSettings } from "@/lib/server-functions/settings";

const navItems = [
  { label: "AI Agents", to: "/dashboard", icon: Bot },
  { label: "Analytics", to: "/dashboard/analytics", icon: BarChart3 },
  { label: "Activity", to: "/dashboard/activity", icon: MessageSquare },
  { label: "Integrations", to: "/dashboard/integrations", icon: Plug },
  { label: "Settings", to: "/dashboard/settings", icon: Settings },
  { label: "LiveDemo", to: "/dashboard/livedemo", icon: Monitor },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: settings } = useQuery({
    queryKey: ["public-platform-settings"],
    queryFn: () => getPublicPlatformSettings(),
    staleTime: 60_000,
  });

  const platformName = settings?.platform_name ?? "BotbaseAI";

  function handleNav() {
    onClose?.();
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-6">
        <Link to="/" className="flex items-center gap-2" onClick={handleNav}>
          <img src="/logos.svg" alt={platformName} className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">
            {platformName}
          </span>
        </Link>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.to === "/dashboard"
              ? pathname === "/dashboard" ||
                pathname === "/dashboard/" ||
                pathname.startsWith("/dashboard/agents/")
              : pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={handleNav}
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
          onClick={handleNav}
          className="flex items-center gap-3 rounded-lg bg-gradient-brand px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade Plan
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-sidebar shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
