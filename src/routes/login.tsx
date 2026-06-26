import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  }

  async function handleFacebookLogin() {
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogleLogin}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button
                onClick={handleFacebookLogin}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </button>
            </div>
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
