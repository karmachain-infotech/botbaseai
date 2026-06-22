import { Link, useRouter, useNavigate } from "@tanstack/react-router";
import { Bell, Search, LogOut, Settings, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState, type FormEvent } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopbarProps {
  onToggleSidebar?: () => void;
}

export function DashboardTopbar({ onToggleSidebar }: TopbarProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "?";

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate({ to: "/dashboard", search: q ? { q } : {} });
  }

  async function handleSignOut() {
    await signOut();
    router.navigate({ to: "/" });
  }

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <button onClick={onToggleSidebar} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" aria-label="Toggle sidebar">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <img src="/logos.svg" alt="BotbaseAI" className="h-8 w-8" />
        </Link>
      </div>

      <form onSubmit={handleSearch} className="relative w-full max-w-md">
        <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer">
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
        <input
          type="search"
          placeholder="Search agents, conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </form>

      <div className="flex items-center gap-3">
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-primary-foreground cursor-pointer"
              aria-label="Account menu"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
              {user?.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive cursor-pointer">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
