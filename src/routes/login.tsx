import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { TriangleAlert } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — BotbaseAI" },
      { name: "description", content: "Log in to your BotbaseAI account." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard" });
  }, [user, authLoading]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    navigate({ to: "/dashboard" });
  }

  async function handleGoogleLogin() {
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (oauthError) setError(oauthError.message);
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <TriangleAlert className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Supabase not configured</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Set <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code> and{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code> in{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">.env.local</code> to enable authentication.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">← Back to home</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <motion.div
          className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.h1
            className="text-2xl font-bold tracking-tight"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >Welcome back</motion.h1>
          <motion.p
            className="mt-1 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >Log in to your BotbaseAI account.</motion.p>

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
            </div>
            <button
              onClick={handleGoogleLogin}
              className="mt-4 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Google
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
