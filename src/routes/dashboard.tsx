import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { syncSubscription } from "@/lib/server-functions/stripe";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { AlertTriangle, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  errorComponent: DashboardError,
});

function DashboardLayout() {
  const { user, loading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    syncSubscription().catch(() => console.error("Failed to sync subscription"));
  }, [user, loading]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <DashboardSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-8">
      <div className="mx-auto max-w-md text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-bold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred in the dashboard."}
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    </div>
  );
}
