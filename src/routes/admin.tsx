import {
  createFileRoute,
  Outlet,
  Link,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { checkIsAdmin } from "@/lib/server-functions/admin";
import {
  LayoutDashboard,
  Users,
  Bot,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

const adminNavItems = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Chatbots", to: "/admin/chatbots", icon: Bot },
  { label: "Billing", to: "/admin/billing", icon: CreditCard },
  { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminState, setAdminState] = useState<"checking" | "ready" | "denied">(
    "checking",
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.navigate({ to: "/login" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await checkIsAdmin();
        if (cancelled) return;
        setAdminState(result.isAdmin ? "ready" : "denied");
      } catch {
        if (!cancelled) setAdminState("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, loading]);

  if (loading || adminState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (adminState === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black gap-4">
        <div className="rounded-full bg-red-600/10 p-4">
          <ShieldAlert className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-zinc-400">You don't have admin privileges.</p>
        <Link
          to="/dashboard"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform md:static md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">
              A
            </span>
            <span className="text-lg font-bold text-white">Admin</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {adminNavItems.map((item) => {
            const isActive =
              item.to === "/admin"
                ? pathname === "/admin" || pathname === "/admin/"
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-red-600/10 text-red-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ChevronRight className="h-4 w-4" />
            Back to app
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400 truncate max-w-[200px]">
              {user?.email}
            </span>
            <div className="h-6 w-px bg-zinc-800" />
            <AdminSignOutButton />
          </div>
        </header>

        <main className="flex-1 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminSignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.navigate({ to: "/" });
      }}
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
