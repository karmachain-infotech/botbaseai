import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import type { User } from "@supabase/supabase-js";
import { refreshSession } from "./server-functions/auth";
import { checkIsAdmin } from "./server-functions/admin";

interface AuthContextValue {
  user: User | null;
  is_admin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  is_admin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = isSupabaseConfigured() ? createClient() : null;

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Auth session error:", error.message);
        }
        if (data.session?.user) {
          if (!cancelled) setUser(data.session.user);
          try {
            const result = await checkIsAdmin();
            if (!cancelled) setIsAdmin(result.isAdmin);
          } catch {}
          if (!cancelled) setLoading(false);
          return;
        }

        // Fallback: server-side session check (refreshes HttpOnly cookies to non-HttpOnly)
        const result = await refreshSession();
        if (result.ok && !cancelled) {
          const { data: retry } = await supabase.auth.getSession();
          if (!cancelled) {
            setUser(retry.session?.user ?? null);
            if (retry.session?.user) {
              try {
                const adminResult = await checkIsAdmin();
                if (!cancelled) setIsAdmin(adminResult.isAdmin);
              } catch {}
            }
          }
        } else if (!cancelled) {
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to get auth session:", err);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Sign out error:", error.message);
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, is_admin: isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
